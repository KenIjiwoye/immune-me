'use strict';

const { Client, Databases, Query, Functions } = require('node-appwrite');
const {
  parseJSONSafe,
  isRetryableError,
  nowIso,
  sanitizeDocumentData
} = require('../../../../utils/sync-utilities');
const SYNC_CONFIG = require('../../../../config/sync-configuration.json');

module.exports = async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);
  const functions = new Functions(client);

  try {
    const { deviceId, userId, queuedOperations } = parseJSONSafe(req.payload, {});

    if (!deviceId || !userId || !Array.isArray(queuedOperations)) {
      return res.json(
        {
          success: false,
          error: 'Device ID, User ID, and queued operations required'
        },
        400
      );
    }

    const processResults = [];
    let successCount = 0;
    let failureCount = 0;

    for (const operation of queuedOperations) {
      try {
        const result = await processQueuedOperation({
          databases,
          functions,
          operation,
          userId,
          deviceId,
          log
        });
        processResults.push({
          operationId: operation.id || null,
          success: true,
          result
        });
        successCount++;
      } catch (opError) {
        const retryable = isRetryableError(opError);
        error(
          `Failed to process operation ${operation.id || '(no-id)'}: ${
            opError.message
          }${retryable ? ' (retryable)' : ''}`
        );
        processResults.push({
          operationId: operation.id || null,
          success: false,
          error: opError.message,
          retryable
        });
        failureCount++;
      }
    }

    // Log queue processing
    await safeCreate(databases, 'immune-me-db', SYNC_CONFIG.loggingCollections.queueProcessingLog, {
      device_id: deviceId,
      user_id: userId,
      total_operations: queuedOperations.length,
      success_count: successCount,
      failure_count: failureCount,
      processed_at: nowIso(),
      results: JSON.stringify(processResults)
    });

    log(
      `Processed ${queuedOperations.length} queued operations: ${successCount} success, ${failureCount} failures`
    );

    return res.json({
      success: true,
      processed: queuedOperations.length,
      successful: successCount,
      failed: failureCount,
      results: processResults
    });
  } catch (err) {
    error('Offline queue processing failed: ' + err.message);
    return res.json({ success: false, error: err.message }, 500);
  }
};

/**
 * Helpers
 */

async function processQueuedOperation({ databases, functions, operation, userId, deviceId, log }) {
  const { type, collection, documentId, data, timestamp } = operation || {};

  switch (type) {
    case 'create':
      return await handleCreateOperation(databases, collection, documentId, data, userId);
    case 'update':
      return await handleUpdateOperation(
        functions,
        collection,
        documentId,
        data,
        timestamp,
        userId,
        deviceId
      );
    case 'delete':
      return await handleDeleteOperation(databases, collection, documentId, userId);
    default:
      throw new Error(`Unknown operation type: ${type}`);
  }
}

async function handleCreateOperation(databases, collection, documentId, data, userId) {
  try {
    // If document exists, treat as update to be idempotent
    await databases.getDocument('immune-me-db', collection, documentId);
    return await databases.updateDocument('immune-me-db', collection, documentId, {
      ...sanitizeDocumentData(data),
      updatedBy: userId,
      updatedAt: nowIso()
    });
  } catch (getError) {
    if (getError.code === 404) {
      return await databases.createDocument('immune-me-db', collection, documentId, {
        ...sanitizeDocumentData(data),
        createdBy: userId,
        createdAt: nowIso()
      });
    }
    throw getError;
  }
}

async function handleUpdateOperation(functions, collection, documentId, data, timestamp, userId, deviceId) {
  const functionId = (SYNC_CONFIG.functionIds && SYNC_CONFIG.functionIds.conflict) || 'conflict-resolution';
  const exec = await functions.createExecution(
    functionId,
    JSON.stringify({
      collection,
      documentId,
      clientData: data,
      clientTimestamp: timestamp || nowIso(),
      deviceId,
      userId
    })
  );

  // Appwrite wraps the function's response JSON as a string in `response`
  const parsed = parseJSONSafe(exec.response, {});
  if (!parsed || parsed.success === false) {
    const err = new Error(parsed && parsed.error ? parsed.error : 'Conflict function failed');
    err.code = parsed && parsed.code;
    throw err;
  }
  return parsed;
}

async function handleDeleteOperation(databases, collection, documentId, userId) {
  try {
    const document = await databases.getDocument('immune-me-db', collection, documentId);

    // Log deletion (soft delete log)
    await databases.createDocument(
      'immune-me-db',
      (SYNC_CONFIG.loggingCollections && SYNC_CONFIG.loggingCollections.deletionLog) || 'deletion_log',
      'unique()',
      {
        collection,
        document_id: documentId,
        original_data: JSON.stringify(document),
        deleted_by: userId,
        deleted_at: nowIso()
      }
    );

    // Hard delete data document
    await databases.deleteDocument('immune-me-db', collection, documentId);

    return { deleted: true, documentId };
  } catch (deleteError) {
    if (deleteError.code === 404) {
      // Document already deleted
      return { deleted: true, documentId, alreadyDeleted: true };
    }
    throw deleteError;
  }
}

async function safeCreate(databases, dbId, collectionId, data) {
  try {
    await databases.createDocument(dbId, collectionId, 'unique()', data);
  } catch {
    /* swallow logging errors */
  }
}