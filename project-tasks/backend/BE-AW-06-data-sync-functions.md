# BE-AW-06: Create Offline-First Data Synchronization Functions

## Title
Create Offline-First Data Synchronization Functions

## Priority
High

## Estimated Time
12-15 hours

## Dependencies
- BE-AW-01: Appwrite project setup completed
- BE-AW-02: Database collections created
- BE-AW-03: Authentication system migrated

## Description
Create and deploy Appwrite Cloud Functions to implement offline-first data synchronization capabilities for the mobile application. This includes conflict resolution, incremental sync, data validation, and real-time synchronization when connectivity is restored. The functions will ensure data consistency across devices while supporting offline operation in areas with poor connectivity.

The implementation will handle bidirectional synchronization between mobile devices and the Appwrite backend, with intelligent conflict resolution and data integrity validation.

## Acceptance Criteria
- [ ] Incremental data sync functions created and deployed
- [ ] Conflict resolution algorithms implemented
- [ ] Data validation and integrity checking functions operational
- [ ] Real-time sync triggers configured
- [ ] Offline queue processing functions working
- [ ] Sync status tracking and monitoring implemented
- [ ] Data compression and optimization functions deployed
- [ ] Batch sync operations for large datasets functional
- [ ] Sync failure recovery mechanisms implemented
- [ ] Client sync API endpoints created

## Technical Notes

### Core Synchronization Functions

#### 1. Incremental Data Sync Function
```javascript
// appwrite-backend/functions/data-sync/incremental-data-sync/src/main.js
const { Client, Databases, Query } = require('node-appwrite');

module.exports = async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  try {
    const { 
      deviceId, 
      lastSyncTimestamp, 
      collections, 
      userId,
      facilityId 
    } = JSON.parse(req.payload || '{}');

    if (!deviceId || !userId) {
      return res.json({ success: false, error: 'Device ID and User ID required' }, 400);
    }

    const syncTimestamp = new Date().toISOString();
    const lastSync = lastSyncTimestamp || '1970-01-01T00:00:00.000Z';

    // Get user permissions and facility access
    const userPermissions = await getUserPermissions(userId, facilityId);

    const syncResults = {};

    // Sync each requested collection
    for (const collectionName of collections || ['patients', 'immunization_records', 'notifications']) {
      try {
        const collectionSync = await syncCollection(
          collectionName,
          lastSync,
          userPermissions,
          facilityId
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
    await databases.createDocument(
      'immune-me-db',
      'sync_operations',
      'unique()',
      {
        deviceId,
        userId,
        facilityId,
        syncTimestamp,
        lastSyncTimestamp: lastSync,
        collections: Object.keys(syncResults),
        status: 'completed',
        results: JSON.stringify(syncResults)
      }
    );

    log(`Incremental sync completed for device ${deviceId}, user ${userId}`);

    return res.json({
      success: true,
      syncTimestamp,
      results: syncResults,
      nextSyncRecommended: new Date(Date.now() + (5 * 60 * 1000)).toISOString() // 5 minutes
    });

  } catch (err) {
    error('Incremental data sync failed: ' + err.message);
    return res.json({ success: false, error: err.message }, 500);
  }

  async function getUserPermissions(userId, facilityId) {
    try {
      const user = await databases.getDocument('immune-me-db', 'users', userId);
      return {
        role: user.role,
        facilityId: user.facilityId || facilityId,
        canAccessAllFacilities: user.role === 'admin'
      };
    } catch (err) {
      throw new Error('Failed to get user permissions');
    }
  }

  async function syncCollection(collectionName, lastSync, permissions, facilityId) {
    // Build query filters based on permissions
    const filters = [
      Query.greaterThan('$updatedAt', lastSync),
      Query.limit(100) // Batch size
    ];

    // Add facility filter if user doesn't have admin access
    if (!permissions.canAccessAllFacilities && permissions.facilityId) {
      filters.push(Query.equal('facilityId', permissions.facilityId));
    }

    // Get updated documents
    const updatedDocs = await databases.listDocuments(
      'immune-me-db',
      collectionName,
      filters
    );

    // Get deleted documents from deletion log
    const deletedDocs = await databases.listDocuments(
      'immune-me-db',
      'deletion_log',
      [
        Query.equal('collection', collectionName),
        Query.greaterThan('deletedAt', lastSync),
        Query.limit(50)
      ]
    );

    return {
      success: true,
      updated: updatedDocs.documents.map(doc => ({
        id: doc.$id,
        data: doc,
        updatedAt: doc.$updatedAt,
        operation: 'update'
      })),
      deleted: deletedDocs.documents.map(doc => ({
        id: doc.documentId,
        deletedAt: doc.deletedAt,
        operation: 'delete'
      })),
      hasMore: updatedDocs.total > updatedDocs.documents.length
    };
  }
};
```

#### 2. Conflict Resolution Function
```javascript
// appwrite-backend/functions/data-sync/conflict-resolution/src/main.js
const { Client, Databases } = require('node-appwrite');

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
    } = JSON.parse(req.payload || '{}');

    // Get current server version
    let serverData;
    try {
      serverData = await databases.getDocument('immune-me-db', collection, documentId);
    } catch (getError) {
      if (getError.code === 404) {
        // Document doesn't exist on server, create it
        return await createDocument(collection, documentId, clientData, userId);
      }
      throw getError;
    }

    // Check if conflict exists
    const serverTimestamp = new Date(serverData.$updatedAt).getTime();
    const clientTime = new Date(clientTimestamp).getTime();

    if (serverTimestamp <= clientTime) {
      // No conflict, client version is newer or same
      return await updateDocument(collection, documentId, clientData, userId);
    }

    // Conflict detected - apply resolution strategy
    const resolutionStrategy = getResolutionStrategy(collection);
    const resolvedData = await resolveConflict(
      resolutionStrategy,
      serverData,
      clientData,
      { deviceId, userId, collection }
    );

    // Log conflict for audit
    await logConflict({
      collection,
      documentId,
      serverData,
      clientData,
      resolvedData,
      strategy: resolutionStrategy,
      deviceId,
      userId
    });

    // Update with resolved data
    const updatedDoc = await databases.updateDocument(
      'immune-me-db',
      collection,
      documentId,
      resolvedData
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

  function getResolutionStrategy(collection) {
    const strategies = {
      'patients': 'merge_with_server_priority',
      'immunization_records': 'server_wins', // Critical medical data
      'notifications': 'client_wins',
      'facilities': 'server_wins',
      'vaccines': 'server_wins'
    };

    return strategies[collection] || 'server_wins';
  }

  async function resolveConflict(strategy, serverData, clientData, context) {
    switch (strategy) {
      case 'server_wins':
        return serverData;

      case 'client_wins':
        return { ...clientData, $id: serverData.$id };

      case 'merge_with_server_priority':
        return mergeWithServerPriority(serverData, clientData);

      case 'merge_with_client_priority':
        return mergeWithClientPriority(serverData, clientData);

      case 'field_level_merge':
        return fieldLevelMerge(serverData, clientData, context);

      default:
        return serverData;
    }
  }

  function mergeWithServerPriority(serverData, clientData) {
    // Merge objects, server data takes priority for conflicts
    const merged = { ...clientData };
    
    // Critical fields always use server version
    const criticalFields = ['$id', '$createdAt', '$updatedAt', 'facilityId'];
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
    // Merge objects, client data takes priority for conflicts
    const merged = { ...serverData };
    
    // System fields always use server version
    const systemFields = ['$id', '$createdAt', '$updatedAt'];
    
    Object.keys(clientData).forEach(key => {
      if (systemFields.includes(key)) return;
      
      if (clientData[key] !== undefined) {
        merged[key] = clientData[key]; // Client priority
      }
    });

    return merged;
  }

  function fieldLevelMerge(serverData, clientData, context) {
    // Implement field-level conflict resolution based on business rules
    const merged = { ...serverData };

    // Example: For patient data, merge contact info from client but keep medical data from server
    if (context.collection === 'patients') {
      // Client can update contact information
      const clientUpdatableFields = ['contactPhone', 'address', 'townVillage'];
      clientUpdatableFields.forEach(field => {
        if (clientData[field] !== undefined) {
          merged[field] = clientData[field];
        }
      });

      // Server maintains critical medical information
      const serverOnlyFields = ['facilityId', 'healthWorkerId'];
      serverOnlyFields.forEach(field => {
        merged[field] = serverData[field];
      });
    }

    return merged;
  }

  async function createDocument(collection, documentId, data, userId) {
    const newDoc = await databases.createDocument(
      'immune-me-db',
      collection,
      documentId,
      data
    );

    return res.json({
      success: true,
      conflictResolved: false,
      operation: 'created',
      document: newDoc
    });
  }

  async function updateDocument(collection, documentId, data, userId) {
    const updatedDoc = await databases.updateDocument(
      'immune-me-db',
      collection,
      documentId,
      data
    );

    return res.json({
      success: true,
      conflictResolved: false,
      operation: 'updated',
      document: updatedDoc
    });
  }

  async function logConflict(conflictData) {
    try {
      await databases.createDocument(
        'immune-me-db',
        'conflict_log',
        'unique()',
        {
          ...conflictData,
          serverData: JSON.stringify(conflictData.serverData),
          clientData: JSON.stringify(conflictData.clientData),
          resolvedData: JSON.stringify(conflictData.resolvedData),
          timestamp: new Date().toISOString()
        }
      );
    } catch (logError) {
      error('Failed to log conflict: ' + logError.message);
    }
  }
};
```

#### 3. Offline Queue Processor Function
```javascript
// appwrite-backend/functions/data-sync/offline-queue-processor/src/main.js
const { Client, Databases, Query } = require('node-appwrite');

module.exports = async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  try {
    const { 
      deviceId,
      userId,
      queuedOperations 
    } = JSON.parse(req.payload || '{}');

    if (!deviceId || !userId || !queuedOperations) {
      return res.json({ 
        success: false, 
        error: 'Device ID, User ID, and queued operations required' 
      }, 400);
    }

    const processResults = [];
    let successCount = 0;
    let failureCount = 0;

    // Process operations in order
    for (const operation of queuedOperations) {
      try {
        const result = await processQueuedOperation(operation, userId, deviceId);
        processResults.push({
          operationId: operation.id,
          success: true,
          result: result
        });
        successCount++;
      } catch (opError) {
        error(`Failed to process operation ${operation.id}: ${opError.message}`);
        processResults.push({
          operationId: operation.id,
          success: false,
          error: opError.message,
          retryable: isRetryableError(opError)
        });
        failureCount++;
      }
    }

    // Log queue processing
    await databases.createDocument(
      'immune-me-db',
      'queue_processing_log',
      'unique()',
      {
        deviceId,
        userId,
        totalOperations: queuedOperations.length,
        successCount,
        failureCount,
        processedAt: new Date().toISOString(),
        results: JSON.stringify(processResults)
      }
    );

    log(`Processed ${queuedOperations.length} queued operations: ${successCount} success, ${failureCount} failures`);

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

  async function processQueuedOperation(operation, userId, deviceId) {
    const { type, collection, documentId, data, timestamp } = operation;

    switch (type) {
      case 'create':
        return await handleCreateOperation(collection, documentId, data, userId);

      case 'update':
        return await handleUpdateOperation(collection, documentId, data, timestamp, userId, deviceId);

      case 'delete':
        return await handleDeleteOperation(collection, documentId, userId);

      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  }

  async function handleCreateOperation(collection, documentId, data, userId) {
    // Check if document already exists
    try {
      const existing = await databases.getDocument('immune-me-db', collection, documentId);
      // Document exists, treat as update
      return await handleUpdateOperation(collection, documentId, data, data.timestamp, userId, data.deviceId);
    } catch (getError) {
      if (getError.code === 404) {
        // Document doesn't exist, create it
        return await databases.createDocument('immune-me-db', collection, documentId, {
          ...data,
          createdBy: userId,
          createdAt: new Date().toISOString()
        });
      }
      throw getError;
    }
  }

  async function handleUpdateOperation(collection, documentId, data, timestamp, userId, deviceId) {
    // Use conflict resolution function
    const conflictResolution = await client.functions.createExecution(
      'conflict-resolution',
      JSON.stringify({
        collection,
        documentId,
        clientData: data,
        clientTimestamp: timestamp,
        deviceId,
        userId
      })
    );

    const result = JSON.parse(conflictResolution.response);
    if (!result.success) {
      throw new Error(result.error);
    }

    return result;
  }

  async function handleDeleteOperation(collection, documentId, userId) {
    try {
      // Soft delete - move to deletion log
      const document = await databases.getDocument('immune-me-db', collection, documentId);
      
      // Log deletion
      await databases.createDocument(
        'immune-me-db',
        'deletion_log',
        'unique()',
        {
          collection,
          documentId,
          originalData: JSON.stringify(document),
          deletedBy: userId,
          deletedAt: new Date().toISOString()
        }
      );

      // Delete the document
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

  function isRetryableError(error) {
    // Determine if error is retryable
    const retryableCodes = [500, 502, 503, 504, 429]; // Server errors and rate limits
    return retryableCodes.includes(error.code) || 
           error.message.includes('network') ||
           error.message.includes('timeout');
  }
};
```

#### 4. Real-time Sync Trigger Function
```javascript
// appwrite-backend/functions/data-sync/real-time-sync-trigger/src/main.js
const { Client, Databases, Query } = require('node-appwrite');

module.exports = async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  try {
    // This function is triggered by database events
    const { 
      $id: documentId,
      $collection: collectionId,
      $database: databaseId,
      ...documentData 
    } = JSON.parse(req.payload || '{}');

    // Get active sync sessions for this collection
    const activeSessions = await databases.listDocuments(
      'immune-me-db',
      'active_sync_sessions',
      [
        Query.equal('collections', collectionId),
        Query.equal('status', 'active'),
        Query.greaterThan('lastHeartbeat', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // 5 minutes
      ]
    );

    // Notify active sessions about the change
    const notifications = [];
    for (const session of activeSessions.documents) {
      try {
        // Create sync notification
        const notification = await databases.createDocument(
          'immune-me-db',
          'sync_notifications',
          'unique()',
          {
            deviceId: session.deviceId,
            userId: session.userId,
            collection: collectionId,
            documentId: documentId,
            operation: determineOperation(req.headers),
            timestamp: new Date().toISOString(),
            status: 'pending'
          }
        );

        notifications.push(notification);

        // Send real-time notification if WebSocket connection exists
        await sendRealtimeNotification(session.deviceId, {
          type: 'sync_update',
          collection: collectionId,
          documentId: documentId,
          operation: determineOperation(req.headers),
          timestamp: new Date().toISOString()
        });

      } catch (notifyError) {
        error(`Failed to notify session ${session.deviceId}: ${notifyError.message}`);
      }
    }

    log(`Triggered real-time sync for ${notifications.length} active sessions`);

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

  function determineOperation(headers) {
    // Determine operation type from request headers or context
    const method = headers['x-appwrite-trigger-method'] || 'unknown';
    
    switch (method) {
      case 'POST': return 'create';
      case 'PUT': 
      case 'PATCH': return 'update';
      case 'DELETE': return 'delete';
      default: return 'update';
    }
  }

  async function sendRealtimeNotification(deviceId, data) {
    try {
      // Implementation would depend on your real-time notification system
      // This could be WebSocket, Server-Sent Events, or push notifications
      
      // For now, we'll create a pending notification that the client can poll
      await databases.createDocument(
        'immune-me-db',
        'realtime_notifications',
        'unique()',
        {
          deviceId,
          data: JSON.stringify(data),
          createdAt: new Date().toISOString(),
          delivered: false
        }
      );
    } catch (realtimeError) {
      error(`Failed to send real-time notification: ${realtimeError.message}`);
    }
  }
};
```

### Sync Configuration

#### Function Event Triggers
```json
{
  "functions": [
    {
      "name": "incremental-data-sync",
      "runtime": "node-18.0",
      "execute": ["role:authenticated"],
      "events": [],
      "timeout": 600
    },
    {
      "name": "conflict-resolution",
      "runtime": "node-18.0",
      "execute": ["role:authenticated"],
      "events": [],
      "timeout": 300
    },
    {
      "name": "offline-queue-processor",
      "runtime": "node-18.0",
      "execute": ["role:authenticated"],
      "events": [],
      "timeout": 900
    },
    {
      "name": "real-time-sync-trigger",
      "runtime": "node-18.0",
      "execute": ["role:system"],
      "events": [
        "databases.*.collections.patients.documents.*.create",
        "databases.*.collections.patients.documents.*.update",
        "databases.*.collections.patients.documents.*.delete",
        "databases.*.collections.immunization_records.documents.*.create",
        "databases.*.collections.immunization_records.documents.*.update",
        "databases.*.collections.immunization_records.documents.*.delete"
      ],
      "timeout": 300
    }
  ]
}
```

## Files to Create/Modify
- `appwrite-backend/functions/data-sync/incremental-data-sync/` - Incremental sync function
- `appwrite-backend/functions/data-sync/conflict-resolution/` - Conflict resolution function
- `appwrite-backend/functions/data-sync/offline-queue-processor/` - Queue processing function
- `appwrite-backend/functions/data-sync/real-time-sync-trigger/` - Real-time sync triggers
- `appwrite-backend/functions/data-sync/data-validation/` - Data validation function
- `appwrite-backend/functions/data-sync/sync-status-monitor/` - Sync monitoring function
- `appwrite-backend/schemas/sync-collections.json` - Sync-related collection schemas
- `appwrite-backend/utils/sync-utilities.js` - Sync utility functions
- `appwrite-backend/config/sync-configuration.json` - Sync configuration settings

## Testing Requirements

### Sync Function Testing
1. **Incremental Sync Test**
   ```javascript
   // Test incremental sync
   const syncRequest = {
     deviceId: 'test-device-001',
     userId: 'test-user-001',
     lastSyncTimestamp: '2024-01-01T00:00:00.000Z',
     collections: ['patients', 'immunization_records']
   };
   
   const result = await mcpServer.functions.createExecution(
     'incremental-data-sync',
     JSON.stringify(syncRequest)
   );
   
   const response = JSON.parse(result.response);
   assert(response.success, 'Sync should succeed');
   assert(response.results.patients, 'Should return patient sync results');
   ```

2. **Conflict Resolution Test**
   ```javascript
   // Test conflict resolution
   const conflictData = {
     collection: 'patients',
     documentId: 'test-patient-001',
     clientData: { fullName: 'Client Name', updatedAt: '2024-01-02T10:00:00.000Z' },
     clientTimestamp: '2024-01-02T10:00:00.000Z',
     deviceId: 'test-device-001',
     userId: 'test-user-001'
   };
   
   const result = await mcpServer.functions.createExecution(
     'conflict-resolution',
     JSON.stringify(conflictData)
   );
   
   const response = JSON.parse(result.response);
   assert(response.success, 'Conflict resolution should succeed');
   ```

### Performance Testing
1. **Large Dataset Sync**
   - Test sync with 10,000+ records
   - Verify memory usage and performance
   - Test batch processing efficiency

2. **Concurrent Sync Operations**
   - Test multiple devices syncing simultaneously
   - Verify conflict resolution under load
   - Test queue processing performance

### Reliability Testing
1. **Network Interruption Simulation**
   - Test sync resumption after network failure
   - Verify data integrity after interruptions
   - Test retry mechanisms

2. **Conflict Resolution Accuracy**
   - Test various conflict scenarios
   - Verify business rule enforcement
   - Test data consistency after resolution

## Implementation Steps

### Phase 1: Core Sync Functions
1. Implement incremental sync function
2. Create conflict resolution algorithms
3. Build offline queue processor
4. Test basic sync operations

### Phase 2: Real-time Integration
1. Set up event triggers
2. Implement real-time notifications
3. Create sync monitoring
4. Test real-time sync flow

### Phase 3: Optimization and Reliability
1. Implement data compression
2. Add batch processing optimization
3. Create failure recovery mechanisms
4. Performance tuning and testing

### Phase 4: Monitoring and Maintenance
1. Set up sync monitoring dashboard
2. Implement alerting for sync failures
3. Create maintenance procedures
4. Document operational processes

## Success Metrics
- Sync functions handle expected data volumes
- Conflict resolution maintains data integrity
- Real-time sync latency under 5 seconds
- Offline queue processing success rate > 95%
- Sync failure recovery working correctly
- Performance meets mobile app requirements

## Rollback Plan
- Maintain existing data sync mechanisms during transition
- Test rollback procedures in development
- Document all sync configurations
- Ensure data consistency during rollback

## Next Steps
After completion, this task enables:
- FE-AW-02: Frontend offline storage implementation
- FE-AW-05: Real-time data synchronization
- Full offline-first mobile application functionality
- Enhanced user experience in low-connectivity areas