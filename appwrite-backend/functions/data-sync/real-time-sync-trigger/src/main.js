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
    // This function is triggered by database events; Appwrite passes document in payload when configured
    const payload = parseJSONSafe(req.payload, {});
    const {
      $id: documentId,
      $collectionId: collectionIdAlias,
      $collection: collectionIdCompat,
      $databaseId: databaseIdAlias,
      $database: databaseIdCompat,
      ...documentData
    } = payload;

    const collectionId = collectionIdAlias || collectionIdCompat;
    const databaseId = databaseIdAlias || databaseIdCompat || 'immune-me-db';

    if (!documentId || !collectionId) {
      return res.json({ success: false, error: 'Missing document or collection identifiers' }, 400);
    }

    // Get active sync sessions for this collection (recent heartbeat within window)
    const heartbeatWindowMs =
      (SYNC_CONFIG.realtime && SYNC_CONFIG.realtime.heartbeatWindowSeconds
        ? SYNC_CONFIG.realtime.heartbeatWindowSeconds
        : 300) * 1000;

    const activeSessions = await databases.listDocuments(
      'immune-me-db',
      (SYNC_CONFIG.loggingCollections && SYNC_CONFIG.loggingCollections.activeSyncSessions) || 'active_sync_sessions',
      [
        Query.equal('collections', collectionId),
        Query.equal('status', 'active'),
        Query.greaterThan(
          'last_heartbeat',
          new Date(Date.now() - heartbeatWindowMs).toISOString()
        ),
        Query.limit(100)
      ]
    );

    // Notify active sessions about the change
    const notifications = [];
    for (const session of activeSessions.documents || []) {
      try {
        // Create sync notification
        const notification = await databases.createDocument(
          'immune-me-db',
          (SYNC_CONFIG.loggingCollections && SYNC_CONFIG.loggingCollections.syncNotifications) || 'sync_notifications',
          'unique()',
          {
            device_id: session.device_id,
            user_id: session.user_id,
            collection: collectionId,
            document_id: documentId,
            operation: determineOperation(req.headers || {}),
            timestamp: nowIso(),
            status: 'pending'
          }
        );

        notifications.push(notification);

        // Create a realtime notification record that clients can poll
        await sendRealtimeNotification(databases, session.device_id, {
          type: 'sync_update',
          collection: collectionId,
          document_id: documentId,
          operation: determineOperation(req.headers || {}),
          timestamp: nowIso()
        });
      } catch (notifyError) {
        error(`Failed to notify session ${session.device_id}: ${notifyError.message}`);
      }
    }

    log(`Triggered real-time sync for ${notifications.length} active sessions on ${collectionId}/${documentId}`);

    return res.json({
      success: true,
      notified: notifications.length,
      collection: collectionId,
      document: documentId
    });
  } catch (err) {
    error('Real-time sync trigger failed: ' + err.message);
    return res.json({ success: false, error: err.message }, 500);
  }
};

function determineOperation(headers) {
  const method = headers['x-appwrite-trigger-method'] || headers['X-Appwrite-Trigger-Method'] || 'unknown';
  switch (method) {
    case 'POST':
      return 'create';
    case 'PUT':
    case 'PATCH':
      return 'update';
    case 'DELETE':
      return 'delete';
    default:
      return 'update';
  }
}

async function sendRealtimeNotification(databases, deviceId, data) {
  try {
    await databases.createDocument(
      'immune-me-db',
      (require('../../../../config/sync-configuration.json').loggingCollections.realtimeNotifications ||
        'realtime_notifications'),
      'unique()',
      {
        device_id: deviceId,
        data: JSON.stringify(data),
        created_at: new Date().toISOString(),
        delivered: false
      }
    );
  } catch (realtimeError) {
    // No throw; log handled by caller
    // swallow to not break trigger flow
  }
}