'use strict';

const { Client, Databases, Query } = require('node-appwrite');

const {
  nowIso,
  isNonEmptyString,
  parseJSONSafe,
  buildFacilityFilter,
  buildUpdatedSinceFilter,
  buildPaginationFilter,
  gzipCompressBase64
} = require('../../../../utils/sync-utilities');

const SYNC_CONFIG = require('../../../../config/sync-configuration.json');

module.exports = async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  try {
    const payload = parseJSONSafe(req.payload, {});
    const {
      deviceId,
      lastSyncTimestamp,
      collections,
      userId,
      facilityId,
      pageLimit,          // optional override
      pageCursor,         // optional: continue from a cursor
      compress            // optional: return compressed results (gzip+base64)
    } = payload;

    if (!isNonEmptyString(deviceId) || !isNonEmptyString(userId)) {
      return res.json({ success: false, error: 'Device ID and User ID required' }, 400);
    }

    const syncTimestamp = nowIso();
    const lastSync = isNonEmptyString(lastSyncTimestamp) ? lastSyncTimestamp : '1970-01-01T00:00:00.000Z';
    const targetCollections = Array.isArray(collections) && collections.length > 0
      ? collections
      : SYNC_CONFIG.defaultCollections || ['patients', 'immunization_records', 'notifications'];

    // Get user permissions and facility access
    const userPermissions = await getUserPermissions(databases, userId, facilityId);

    const syncResults = {};

    // Sync each requested collection
    for (const collectionName of targetCollections) {
      try {
        const collectionSync = await syncCollection(
          databases,
          collectionName,
          lastSync,
          userPermissions,
          {
            pageLimit: pageLimit || (SYNC_CONFIG.batch && SYNC_CONFIG.batch.limit) || 100,
            deletedLimit: (SYNC_CONFIG.batch && SYNC_CONFIG.batch.deletedLimit) || 50,
            maxPages: (SYNC_CONFIG.batch && SYNC_CONFIG.batch.maxPages) || 10,
            initialCursor: pageCursor || null
          },
          log
        );
        syncResults[collectionName] = collectionSync;
      } catch (collectionError) {
        error(`Failed to sync collection ${collectionName}: ${collectionError.message}`);
        syncResults[collectionName] = {
          success: false,
          error: collectionError.message
        };
      }
    }

    // Record sync operation
    await safeCreate(databases, 'immune-me-db', SYNC_CONFIG.loggingCollections.syncOperations, {
      device_id: deviceId,
      user_id: userId,
      facility_id: userPermissions.facilityId || facilityId || null,
      sync_timestamp: syncTimestamp,
      last_sync_timestamp: lastSync,
      collections: Object.keys(syncResults),
      status: 'completed',
      results: JSON.stringify(syncResults)
    }, error);

    // Optional compression for optimization
    let compressedResults = null;
    if (compress) {
      try {
        compressedResults = gzipCompressBase64(syncResults);
      } catch (e) {
        // no-op if compression fails
      }
    }

    log(`Incremental sync completed for device ${deviceId}, user ${userId}`);

    return res.json({
      success: true,
      syncTimestamp,
      results: syncResults,
      compressedResults,
      compression: compressedResults ? 'gzip+base64' : null,
      nextSyncRecommended: new Date(Date.now() + (5 * 60 * 1000)).toISOString() // 5 minutes
    });

  } catch (err) {
    error('Incremental data sync failed: ' + err.message);
    return res.json({ success: false, error: err.message }, 500);
  }
};

/**
 * Helpers
 */

async function getUserPermissions(databases, userId, facilityId) {
  try {
    const user = await databases.getDocument('immune-me-db', 'users', userId);
    return {
      role: user.role,
      facilityId: user.facilityId || facilityId || null,
      canAccessAllFacilities: user.role === 'admin'
    };
  } catch (err) {
    // Fall back to limited permissions if user doc not found
    return {
      role: 'unknown',
      facilityId: facilityId || null,
      canAccessAllFacilities: false
    };
  }
}

async function syncCollection(databases, collectionName, lastSync, permissions, pagingCfg, log) {
  const results = {
    success: true,
    updated: [],
    deleted: [],
    hasMore: false,
    nextCursor: null,
    pagesFetched: 0
  };

  // Build base filters
  const updatedSince = buildUpdatedSinceFilter(Query, lastSync);
  const facilityFilter = buildFacilityFilter(Query, permissions);

  // Pagination loop
  let cursor = pagingCfg.initialCursor || null;
  let page = 0;
  const limit = pagingCfg.pageLimit;

  while (page < pagingCfg.maxPages) {
    const filters = [
      ...updatedSince,
      ...facilityFilter,
      ...buildPaginationFilter(Query, limit, cursor)
    ];

    const updatedDocs = await databases.listDocuments(
      'immune-me-db',
      collectionName,
      filters
    );

    const docs = updatedDocs.documents || [];
    // Map docs into transfer format
    results.updated.push(
      ...docs.map(doc => ({
        id: doc.$id,
        data: doc,
        updatedAt: doc.$updatedAt,
        operation: 'update'
      }))
    );

    results.pagesFetched += 1;

    // Determine if there are more pages
    const hasMorePage = (updatedDocs.total > results.updated.length);
    if (!hasMorePage || docs.length === 0) {
      results.hasMore = false;
      results.nextCursor = null;
      break;
    }

    // Advance cursor
    const lastDoc = docs[docs.length - 1];
    cursor = lastDoc.$id;
    results.hasMore = true;
    results.nextCursor = cursor;
    page += 1;
  }

  // Deleted documents since last sync
  const deletedDocs = await databases.listDocuments(
    'immune-me-db',
    (require('../../../../config/sync-configuration.json').loggingCollections.deletionLog || 'deletion_log'),
    [
      Query.equal('collection', collectionName),
      Query.greaterThan('deleted_at', lastSync),
      Query.limit(pagingCfg.deletedLimit)
    ]
  );

  results.deleted = (deletedDocs.documents || []).map(doc => ({
    id: doc.document_id,
    deletedAt: doc.deleted_at,
    operation: 'delete'
  }));

  return results;
}

async function safeCreate(databases, dbId, collectionId, data, errorLogger) {
  try {
    await databases.createDocument(dbId, collectionId, 'unique()', data);
  } catch (e) {
    if (errorLogger) errorLogger(`Failed to create log document in ${collectionId}: ${e.message}`);
  }
}