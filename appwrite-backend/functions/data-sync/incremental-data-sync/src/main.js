'use strict';

const { Client, Databases, Query } = require('node-appwrite');
const FunctionMiddleware = require('../../../../utils/function-middleware');
const FacilityScopedQueries = require('../../../../utils/facility-scoped-queries');

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
  const startTime = Date.now();
  
  // Initialize middleware and scoped queries
  const middleware = new FunctionMiddleware();
  const scopedQueries = new FacilityScopedQueries();
  
  try {
    // 1. Validate function execution permissions
    const validationResult = await middleware.validateFunctionExecution(
      { req, res, log, error },
      'incremental-data-sync',
      'DATA_SYNC'
    );

    if (!validationResult.success) {
      await logSecurityEvent('sync_access_denied', {
        reason: validationResult.error.message,
        userId: req.variables?.APPWRITE_FUNCTION_USER_ID,
        timestamp: nowIso()
      }, error);
      
      return res.json({
        success: false,
        error: validationResult.error.message,
        code: validationResult.error.code
      }, validationResult.error.statusCode);
    }

    const { userId, role, facilityId, permissions } = validationResult.data;

    // 2. Parse and validate request payload
    const payload = parseJSONSafe(req.payload, {});
    const {
      deviceId,
      lastSyncTimestamp,
      collections,
      pageLimit,          // optional override
      pageCursor,         // optional: continue from a cursor
      compress            // optional: return compressed results (gzip+base64)
    } = payload;

    if (!isNonEmptyString(deviceId)) {
      return res.json({
        success: false,
        error: 'Device ID is required',
        code: 'INVALID_REQUEST'
      }, 400);
    }

    // 3. Validate and sanitize sync parameters
    const syncTimestamp = nowIso();
    const lastSync = isNonEmptyString(lastSyncTimestamp) ? lastSyncTimestamp : '1970-01-01T00:00:00.000Z';
    const targetCollections = Array.isArray(collections) && collections.length > 0
      ? collections.filter(col => isValidCollection(col))
      : SYNC_CONFIG.defaultCollections || ['patients', 'immunization_records', 'notifications'];

    // 4. Apply rate limiting check
    const rateLimitKey = `sync:${userId}:${deviceId}`;
    if (!(await checkRateLimit(rateLimitKey, role))) {
      await logSecurityEvent('sync_rate_limit_exceeded', {
        userId,
        deviceId,
        role,
        timestamp: nowIso()
      }, error);
      
      return res.json({
        success: false,
        error: 'Rate limit exceeded for sync operations',
        code: 'RATE_LIMIT_EXCEEDED'
      }, 429);
    }

    const syncResults = {};
    const securityContext = {
      userId,
      role,
      facilityId,
      deviceId,
      allowedCollections: targetCollections
    };

    // 5. Sync each requested collection with proper access control
    for (const collectionName of targetCollections) {
      try {
        // Validate collection access
        const canAccess = await validateCollectionAccess(userId, collectionName, 'read', scopedQueries);
        if (!canAccess.allowed) {
          log(`Collection access denied for ${collectionName}: ${canAccess.reason}`);
          syncResults[collectionName] = {
            success: false,
            error: `Access denied: ${canAccess.reason}`,
            code: 'COLLECTION_ACCESS_DENIED'
          };
          continue;
        }

        const collectionSync = await syncCollectionSecure(
          scopedQueries,
          collectionName,
          lastSync,
          securityContext,
          {
            pageLimit: Math.min(pageLimit || 100, getMaxPageLimit(role)),
            deletedLimit: (SYNC_CONFIG.batch && SYNC_CONFIG.batch.deletedLimit) || 50,
            maxPages: Math.min((SYNC_CONFIG.batch && SYNC_CONFIG.batch.maxPages) || 10, getMaxPages(role)),
            initialCursor: pageCursor || null
          },
          log
        );
        syncResults[collectionName] = collectionSync;
      } catch (collectionError) {
        error(`Failed to sync collection ${collectionName}: ${collectionError.message}`);
        await logSecurityEvent('sync_collection_error', {
          userId,
          collectionName,
          error: collectionError.message,
          timestamp: nowIso()
        }, error);
        
        syncResults[collectionName] = {
          success: false,
          error: collectionError.message,
          code: 'COLLECTION_SYNC_ERROR'
        };
      }
    }

    // 6. Record sync operation with audit trail
    await logSyncOperation({
      device_id: deviceId,
      user_id: userId,
      facility_id: facilityId,
      role: role,
      sync_timestamp: syncTimestamp,
      last_sync_timestamp: lastSync,
      collections: Object.keys(syncResults),
      status: 'completed',
      results: JSON.stringify(syncResults),
      execution_time: Date.now() - startTime,
      security_context: JSON.stringify(securityContext)
    }, error);

    // 7. Optional compression for optimization
    let compressedResults = null;
    if (compress && isCompressionAllowed(role)) {
      try {
        compressedResults = gzipCompressBase64(syncResults);
      } catch (e) {
        log(`Compression failed: ${e.message}`);
      }
    }

    // 8. Log successful sync
    log(`Secure incremental sync completed for device ${deviceId}, user ${userId}, role ${role}`);
    await logSecurityEvent('sync_completed', {
      userId,
      deviceId,
      role,
      facilityId,
      collectionsCount: Object.keys(syncResults).length,
      executionTime: Date.now() - startTime,
      timestamp: nowIso()
    }, error);

    return res.json({
      success: true,
      syncTimestamp,
      results: syncResults,
      compressedResults,
      compression: compressedResults ? 'gzip+base64' : null,
      nextSyncRecommended: new Date(Date.now() + getSyncInterval(role)).toISOString(),
      security: {
        facilityScoped: role !== 'administrator',
        executionTime: Date.now() - startTime,
        rateLimitRemaining: permissions.rateLimit?.remaining
      }
    });

  } catch (err) {
    error('Secure incremental data sync failed: ' + err.message);
    await logSecurityEvent('sync_system_error', {
      error: err.message,
      stack: err.stack,
      timestamp: nowIso()
    }, error);
    
    return res.json({
      success: false,
      error: 'Internal sync error',
      code: 'SYSTEM_ERROR'
    }, 500);
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