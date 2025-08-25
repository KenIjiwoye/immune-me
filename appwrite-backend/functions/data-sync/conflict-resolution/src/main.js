'use strict';

const { Client, Databases } = require('node-appwrite');
const {
  parseJSONSafe,
  sanitizeDocumentData
} = require('../../../../utils/sync-utilities');
const SYNC_CONFIG = require('../../../../config/sync-configuration.json');

module.exports = async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  try {
    const {
      collection,
      documentId,
      clientData,
      clientTimestamp,
      deviceId,
      userId
    } = parseJSONSafe(req.payload, {});

    if (!collection || !documentId) {
      return res.json({ success: false, error: 'collection and documentId are required' }, 400);
    }

    // Get current server version
    let serverData;
    try {
      serverData = await databases.getDocument('immune-me-db', collection, documentId);
    } catch (getError) {
      if (getError.code === 404) {
        // Document doesn't exist on server, create it
        return await createDocument(databases, res, collection, documentId, clientData, userId, log);
      }
      throw getError;
    }

    // Check if conflict exists
    const serverTimestamp = new Date(serverData.$updatedAt).getTime();
    const clientTime = new Date(clientTimestamp || clientData?.updatedAt || clientData?.$updatedAt || 0).getTime();

    if (serverTimestamp <= clientTime) {
      // No conflict, client version is newer or same
      return await updateDocument(databases, res, collection, documentId, clientData, userId, log);
    }

    // Conflict detected - apply resolution strategy
    const resolutionStrategy = getResolutionStrategy(collection);
    const resolvedData = await resolveConflict(
      resolutionStrategy,
      serverData,
      clientData,
      { deviceId, userId, collection, log }
    );

    // Log conflict for audit
    await logConflict(databases, {
      collection,
      documentId,
      serverData,
      clientData,
      resolvedData,
      strategy: resolutionStrategy,
      deviceId,
      userId
    }, error);

    // Update with resolved data
    const updatePayload = sanitizeDocumentData(resolvedData);
    const updatedDoc = await databases.updateDocument(
      'immune-me-db',
      collection,
      documentId,
      updatePayload
    );

    log(`Conflict resolved for ${collection}/${documentId} using ${resolutionStrategy} strategy`);

    return res.json({
      success: true,
      conflictResolved: true,
      strategy: resolutionStrategy,
      resolvedDocument: updatedDoc,
      serverVersion: serverData,
      clientVersion: clientData
    });

  } catch (err) {
    error('Conflict resolution failed: ' + err.message);
    return res.json({ success: false, error: err.message }, 500);
  }
};

/**
 * Strategy selection
 */
function getResolutionStrategy(collection) {
  const strategies = SYNC_CONFIG.conflictStrategies || {};
  return strategies[collection] || strategies.default || 'server_wins';
}

/**
 * Conflict resolution strategies
 */
async function resolveConflict(strategy, serverData, clientData, context) {
  switch (strategy) {
    case 'server_wins':
      return { ...serverData };

    case 'client_wins':
      return { ...clientData, $id: serverData.$id };

    case 'merge_with_server_priority':
      return mergeWithServerPriority(serverData, clientData);

    case 'merge_with_client_priority':
      return mergeWithClientPriority(serverData, clientData);

    case 'field_level_merge':
      return fieldLevelMerge(serverData, clientData, context);

    default:
      return { ...serverData };
  }
}

function mergeWithServerPriority(serverData, clientData) {
  const merged = { ...clientData };

  // Critical fields always use server version
  const criticalFields = ['$id', '$createdAt', '$updatedAt', 'facility_id'];
  criticalFields.forEach(field => {
    if (serverData[field] !== undefined) {
      merged[field] = serverData[field];
    }
  });

  // For other fields, use server version if both exist and are different
  Object.keys(serverData).forEach(key => {
    if (criticalFields.includes(key)) return;

    if (serverData[key] !== undefined && clientData[key] !== undefined) {
      if (serverData[key] !== clientData[key]) {
        merged[key] = serverData[key]; // Server priority
      }
    } else if (serverData[key] !== undefined) {
      merged[key] = serverData[key];
    }
  });

  return merged;
}

function mergeWithClientPriority(serverData, clientData) {
  const merged = { ...serverData };

  // System fields always use server version
  const systemFields = ['$id', '$createdAt', '$updatedAt'];

  Object.keys(clientData || {}).forEach(key => {
    if (systemFields.includes(key)) return;
    if (clientData[key] !== undefined) {
      merged[key] = clientData[key]; // Client priority
    }
  });

  return merged;
}

function fieldLevelMerge(serverData, clientData, context) {
  const merged = { ...serverData };
  // Example: For patient data, merge contact info from client but keep medical data from server
  if (context.collection === 'patients') {
    // Client can update contact information
    const clientUpdatableFields = ['contact_phone', 'address', 'town_village'];
    clientUpdatableFields.forEach(field => {
      if (clientData && clientData[field] !== undefined) {
        merged[field] = clientData[field];
      }
    });

    // Server maintains critical medical information
    const serverOnlyFields = ['facility_id', 'health_worker_id'];
    serverOnlyFields.forEach(field => {
      merged[field] = serverData[field];
    });
  }
  return merged;
}

/**
 * Persistence helpers
 */
async function createDocument(databases, res, collection, documentId, data, userId, log) {
  const payload = sanitizeDocumentData(data);

  const newDoc = await databases.createDocument(
    'immune-me-db',
    collection,
    documentId,
    payload
  );

  log(`Created new ${collection}/${documentId} from client`);
  return res.json({
    success: true,
    conflictResolved: false,
    operation: 'created',
    document: newDoc
  });
}

async function updateDocument(databases, res, collection, documentId, data, userId, log) {
  const payload = sanitizeDocumentData(data);

  const updatedDoc = await databases.updateDocument(
    'immune-me-db',
    collection,
    documentId,
    payload
  );

  log(`Updated ${collection}/${documentId} from client`);
  return res.json({
    success: true,
    conflictResolved: false,
    operation: 'updated',
    document: updatedDoc
  });
}

async function logConflict(databases, conflictData, errorLogger) {
  try {
    await databases.createDocument(
      'immune-me-db',
      (SYNC_CONFIG.loggingCollections && SYNC_CONFIG.loggingCollections.conflictLog) || 'conflict_log',
      'unique()',
      {
        collection: conflictData.collection,
        document_id: conflictData.documentId,
        server_data: JSON.stringify(conflictData.serverData),
        client_data: JSON.stringify(conflictData.clientData),
        resolved_data: JSON.stringify(conflictData.resolvedData),
        strategy: conflictData.strategy,
        device_id: conflictData.deviceId,
        user_id: conflictData.userId,
        timestamp: new Date().toISOString()
      }
    );
  } catch (logError) {
    if (errorLogger) errorLogger('Failed to log conflict: ' + logError.message);
  }
}