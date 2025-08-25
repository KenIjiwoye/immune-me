# Data Sync Functions - Testing Guide

This guide provides minimal examples to validate each Appwrite function created in this ticket. Use Appwrite Functions API (or Console) to execute with JSON payloads.

Prereqs:
- Environment variables set for functions: `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`
- Database ID assumed: `immune-me-db`
- Collections: `patients`, `immunization_records`, `notifications`, plus sync support collections from schemas/sync-collections.json

## 1) Incremental Data Sync
Function ID: `incremental-data-sync`  
File: appwrite-backend/functions/data-sync/incremental-data-sync/src/main.js

Payload:
```json
{
  "deviceId": "test-device-001",
  "userId": "test-user-001",
  "lastSyncTimestamp": "2024-01-01T00:00:00.000Z",
  "collections": ["patients", "immunization_records"],
  "pageLimit": 50,
  "compress": true
}
```

Expect:
- Response.success = true
- Response.results.patients present
- Optional `compressedResults` (gzip+base64) if `compress=true`
- Log in collection `sync_operations` with snake_case fields:
  - device_id, user_id, facility_id?, sync_timestamp, last_sync_timestamp, collections, status, results

## 2) Conflict Resolution
Function ID: `conflict-resolution`  
File: appwrite-backend/functions/data-sync/conflict-resolution/src/main.js

Payload:
```json
{
  "collection": "patients",
  "documentId": "test-patient-001",
  "clientData": { "full_name": "Client Name", "address": "New Address" },
  "clientTimestamp": "2024-01-02T10:00:00.000Z",
  "deviceId": "test-device-001",
  "userId": "test-user-001"
}
```

Expect:
- Response.success = true
- If conflict exists, strategy from config applied
- Audit record in `conflict_log` with snake_case fields:
  - collection, document_id, server_data, client_data, resolved_data, strategy, device_id, user_id, timestamp

## 3) Offline Queue Processor
Function ID: `offline-queue-processor`  
File: appwrite-backend/functions/data-sync/offline-queue-processor/src/main.js

Payload:
```json
{
  "deviceId": "test-device-001",
  "userId": "test-user-001",
  "queuedOperations": [
    {
      "id": "op-1",
      "type": "create",
      "collection": "patients",
      "documentId": "patient-001",
      "data": { "full_name": "Test Person", "sex": "M", "date_of_birth": "2020-01-01", "district": "D1", "address": "Main Street", "facility_id": "fac-1" },
      "timestamp": "2024-01-02T10:00:00.000Z"
    },
    {
      "id": "op-2",
      "type": "update",
      "collection": "patients",
      "documentId": "patient-001",
      "data": { "address": "Second Street" },
      "timestamp": "2024-01-02T11:00:00.000Z"
    },
    {
      "id": "op-3",
      "type": "delete",
      "collection": "patients",
      "documentId": "patient-001"
    }
  ]
}
```

Expect:
- Response.success = true, counts in processed/successful/failed
- Log in `queue_processing_log` snake_case:
  - device_id, user_id, total_operations, success_count, failure_count, processed_at, results
- For delete: soft deletion in `deletion_log` snake_case:
  - collection, document_id, original_data, deleted_by, deleted_at

## 4) Real-time Sync Trigger
Function ID: `real-time-sync-trigger`  
File: appwrite-backend/functions/data-sync/real-time-sync-trigger/src/main.js  
Config: appwrite-backend/functions/data-sync/real-time-sync-trigger/function.json

Events:
- patients create/update/delete
- immunization_records create/update/delete

Test:
- Ensure `active_sync_sessions` contains a recent session:
  - device_id, user_id, collections: includes target collection, status=active, last_heartbeat within window
- Create/update a `patients` doc; expect:
  - `sync_notifications` record: device_id, user_id, collection, document_id, operation, timestamp, status=pending
  - `realtime_notifications` record: device_id, data(json), created_at, delivered=false

## 5) Data Validation
Function ID: `data-validation`  
File: appwrite-backend/functions/data-sync/data-validation/src/main.js

Validate Mode:
```json
{
  "collection": "immunization_records",
  "documents": [
    { "patientId": "p1", "vaccineId": "v1", "doseNumber": 1, "dateAdministered": "2024-01-01", "facilityId": "fac-1" }
  ],
  "mode": "validate"
}
```

Upsert Mode:
```json
{
  "collection": "notifications",
  "documents": [
    { "$id": "notif-001", "userId": "test-user-001", "type": "reminder", "title": "Upcoming dose", "status": "pending" }
  ],
  "mode": "upsert"
}
```

Expect:
- Totals.valid/invalid/processed
- results[] entry per document, with operation when in upsert

Note: Validation rules come from appwrite-backend/config/sync-configuration.json in the `validation` section.

## 6) Sync Status Monitor
Function ID: `sync-status-monitor`  
File: appwrite-backend/functions/data-sync/sync-status-monitor/src/main.js

Payload:
```json
{
  "sinceMinutes": 120,
  "deviceId": "test-device-001"
}
```

Expect:
- Response.success = true
- summary.health in ["healthy", "warning", "degraded"]
- Aggregated metrics across:
  - sync_operations, queue_processing_log, conflict_log, active_sync_sessions, sync_notifications, realtime_notifications, deletion_log
- Recent items slices for quick inspection

## Notes
- Logging collections use snake_case attribute names consistently as defined in appwrite-backend/schemas/sync-collections.json.
- Business data collections retain their domain-specific naming as already defined in schemas.
- To deploy, use Appwrite CLI or extend existing deployment scripts similarly to reports deployment.
