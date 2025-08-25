'use strict';

const { Client, Databases, Query } = require('node-appwrite');
const { parseJSONSafe, nowIso } = require('../../../../utils/sync-utilities');
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
      sinceMinutes = 60,
      deviceId = null,
      userId = null,
      facilityId = null
    } = payload;

    const sinceIso = new Date(Date.now() - (Number(sinceMinutes) * 60 * 1000)).toISOString();
    const dbId = 'immune-me-db';

    const logsCfg = SYNC_CONFIG.loggingCollections || {};
    const colSyncOps = logsCfg.syncOperations || 'sync_operations';
    const colQueue = logsCfg.queueProcessingLog || 'queue_processing_log';
    const colConflicts = logsCfg.conflictLog || 'conflict_log';
    const colActiveSessions = logsCfg.activeSyncSessions || 'active_sync_sessions';
    const colSyncNotifications = logsCfg.syncNotifications || 'sync_notifications';
    const colRealtimeNotifs = logsCfg.realtimeNotifications || 'realtime_notifications';
    const colDeletionLog = logsCfg.deletionLog || 'deletion_log';

    const filtersCommon = [];
    if (deviceId) filtersCommon.push(Query.equal('device_id', deviceId));
    if (userId) filtersCommon.push(Query.equal('user_id', userId));
    if (facilityId) filtersCommon.push(Query.equal('facility_id', facilityId));

    // Fetch in parallel with limited filters per collection
    const [
      syncOps,
      queueOps,
      conflicts,
      activeSessions,
      syncNotifs,
      realtimeNotifs,
      deletions
    ] = await Promise.all([
      // sync operations
      databases.listDocuments(dbId, colSyncOps, [
        Query.greaterThan('sync_timestamp', sinceIso),
        ...filtersCommon,
        Query.limit(100)
      ]),
      // queue processing logs
      databases.listDocuments(dbId, colQueue, [
        Query.greaterThan('processed_at', sinceIso),
        ...filtersCommon,
        Query.limit(100)
      ]),
      // conflicts
      databases.listDocuments(dbId, colConflicts, [
        Query.greaterThan('timestamp', sinceIso),
        deviceId ? Query.equal('deviceId', deviceId) : null,
        userId ? Query.equal('userId', userId) : null,
        Query.limit(100)
      ].filter(Boolean)),
      // active sessions - recent heartbeats only
      databases.listDocuments(dbId, colActiveSessions, [
        Query.equal('status', 'active'),
        Query.greaterThan(
          'last_heartbeat',
          new Date(Date.now() - (SYNC_CONFIG.realtime?.heartbeatWindowSeconds || 300) * 1000).toISOString()
        ),
        userId ? Query.equal('user_id', userId) : null,
        deviceId ? Query.equal('device_id', deviceId) : null,
        Query.limit(100)
      ].filter(Boolean)),
      // sync notifications
      databases.listDocuments(dbId, colSyncNotifications, [
        Query.greaterThan('timestamp', sinceIso),
        deviceId ? Query.equal('device_id', deviceId) : null,
        userId ? Query.equal('user_id', userId) : null,
        Query.limit(100)
      ].filter(Boolean)),
      // realtime notifications
      databases.listDocuments(dbId, colRealtimeNotifs, [
        Query.greaterThan('created_at', sinceIso),
        deviceId ? Query.equal('device_id', deviceId) : null,
        Query.limit(100)
      ].filter(Boolean)),
      // deletions
      databases.listDocuments(dbId, colDeletionLog, [
        Query.greaterThan('deleted_at', sinceIso),
        facilityId ? Query.equal('facility_id', facilityId) : null,
        Query.limit(100)
      ].filter(Boolean))
    ]);

    // Aggregate metrics
    const syncOpDocs = syncOps.documents || [];
    const queueDocs = queueOps.documents || [];
    const conflictDocs = conflicts.documents || [];
    const activeSessionDocs = activeSessions.documents || [];
    const syncNotifDocs = syncNotifs.documents || [];
    const realtimeNotifDocs = realtimeNotifs.documents || [];
    const deletionDocs = deletions.documents || [];

    const totalSyncs = syncOpDocs.length;
    const totalQueuedOps = queueDocs.reduce((sum, d) => sum + (d.totalOperations || 0), 0);
    const totalQueuedSuccess = queueDocs.reduce((sum, d) => sum + (d.successCount || 0), 0);
    const totalQueuedFailed = queueDocs.reduce((sum, d) => sum + (d.failureCount || 0), 0);

    const conflictCount = conflictDocs.length;

    // Notification delivery status
    const pendingSyncNotifs = syncNotifDocs.filter(d => d.status === 'pending').length;
    const deliveredRealtimeNotifs = realtimeNotifDocs.filter(d => d.delivered === true).length;
    const undeliveredRealtimeNotifs = realtimeNotifDocs.filter(d => d.delivered !== true).length;

    const deletionsCount = deletionDocs.length;

    // Per-collection sync counts
    const perCollectionSyncs = {};
    for (const s of syncOpDocs) {
      const cols = Array.isArray(s.collections) ? s.collections : [];
      for (const c of cols) {
        perCollectionSyncs[c] = (perCollectionSyncs[c] || 0) + 1;
      }
    }

    // Status
    const failureRate = totalQueuedOps > 0 ? +(100 * totalQueuedFailed / totalQueuedOps).toFixed(2) : 0;
    const health =
      (failureRate > 10 || conflictCount > 25) ? 'degraded'
      : (failureRate > 2 || conflictCount > 5) ? 'warning'
      : 'healthy';

    const summary = {
      timestamp: nowIso(),
      windowMinutes: sinceMinutes,
      filters: { deviceId, userId, facilityId },
      health,
      metrics: {
        syncOperations: {
          total: totalSyncs,
          perCollection: perCollectionSyncs
        },
        queueProcessing: {
          totalOperations: totalQueuedOps,
          success: totalQueuedSuccess,
          failed: totalQueuedFailed,
          failureRatePercent: failureRate
        },
        conflicts: {
          total: conflictCount
        },
        realtime: {
          activeSessions: activeSessionDocs.length,
          syncNotificationsPending: pendingSyncNotifs,
          realtimeDelivered: deliveredRealtimeNotifs,
          realtimeUndelivered: undeliveredRealtimeNotifs
        },
        deletions: {
          total: deletionsCount
        }
      },
      details: {
        recentSyncs: syncOpDocs.slice(0, 10).map(d => ({
          id: d.$id,
          deviceId: d.device_id,
          userId: d.user_id,
          timestamp: d.sync_timestamp,
          collections: d.collections
        })),
        recentConflicts: conflictDocs.slice(0, 10).map(d => ({
          id: d.$id,
          collection: d.collection,
          documentId: d.documentId,
          strategy: d.strategy,
          timestamp: d.timestamp
        })),
        activeSessions: activeSessionDocs.slice(0, 10).map(s => ({
          id: s.$id,
          deviceId: s.device_id,
          userId: s.user_id,
          lastHeartbeat: s.last_heartbeat,
          collections: s.collections
        }))
      }
    };

    return res.json({ success: true, summary });
  } catch (err) {
    error('Sync status monitor failed: ' + err.message);
    return res.json({ success: false, error: err.message }, 500);
  }
};