# BE-AW-02: Create Appwrite Database Collections Using MCP Server

## Title
Create Appwrite Database Collections Using MCP Server

## Priority
High

## Estimated Time
6-8 hours

## Dependencies
- BE-AW-01: Appwrite project setup completed

## Description
Create and configure all necessary Appwrite database collections to replace the existing PostgreSQL database schema. This task involves using the Appwrite MCP server to programmatically create collections, define attributes, set up indexes, and configure relationships between collections.

The collections will mirror the existing database structure while taking advantage of Appwrite's NoSQL document-based approach and built-in features like real-time subscriptions and automatic API generation.

## Acceptance Criteria
- [ ] All core collections created (Users, Patients, Facilities, Vaccines, etc.)
- [ ] Collection attributes properly defined with correct data types
- [ ] Indexes created for optimal query performance
- [ ] Collection-level permissions configured
- [ ] Relationships between collections established
- [ ] Data validation rules implemented
- [ ] Real-time subscriptions enabled for critical collections
- [ ] Collection schemas documented and version controlled
- [ ] MCP server integration tested and functional

## Technical Notes

### Core Collections to Create

#### 1. Patients Collection
```json
{
  "collectionId": "patients",
  "name": "Patients",
  "attributes": [
    {"key": "fullName", "type": "string", "size": 255, "required": true},
    {"key": "sex", "type": "enum", "elements": ["M", "F"], "required": true},
    {"key": "dateOfBirth", "type": "datetime", "required": true},
    {"key": "motherName", "type": "string", "size": 255},
    {"key": "fatherName", "type": "string", "size": 255},
    {"key": "district", "type": "string", "size": 100, "required": true},
    {"key": "townVillage", "type": "string", "size": 100},
    {"key": "address", "type": "string", "size": 500},
    {"key": "contactPhone", "type": "string", "size": 20},
    {"key": "healthWorkerId", "type": "string", "size": 36},
    {"key": "healthWorkerName", "type": "string", "size": 255},
    {"key": "healthWorkerPhone", "type": "string", "size": 20},
    {"key": "healthWorkerAddress", "type": "string", "size": 500},
    {"key": "facilityId", "type": "string", "size": 36, "required": true}
  ],
  "indexes": [
    {"key": "fullName", "type": "fulltext"},
    {"key": "district", "type": "key"},
    {"key": "facilityId", "type": "key"},
    {"key": "dateOfBirth", "type": "key"}
  ]
}
```

#### 2. Facilities Collection
```json
{
  "collectionId": "facilities",
  "name": "Facilities",
  "attributes": [
    {"key": "name", "type": "string", "size": 255, "required": true},
    {"key": "type", "type": "enum", "elements": ["hospital", "clinic", "health_center", "outreach_post"], "required": true},
    {"key": "district", "type": "string", "size": 100, "required": true},
    {"key": "address", "type": "string", "size": 500},
    {"key": "contactPhone", "type": "string", "size": 20},
    {"key": "contactEmail", "type": "email"},
    {"key": "isActive", "type": "boolean", "default": true}
  ],
  "indexes": [
    {"key": "name", "type": "fulltext"},
    {"key": "district", "type": "key"},
    {"key": "type", "type": "key"}
  ]
}
```

#### 3. Vaccines Collection
```json
{
  "collectionId": "vaccines",
  "name": "Vaccines",
  "attributes": [
    {"key": "name", "type": "string", "size": 255, "required": true},
    {"key": "description", "type": "string", "size": 1000},
    {"key": "manufacturer", "type": "string", "size": 255},
    {"key": "dosageForm", "type": "string", "size": 100},
    {"key": "routeOfAdministration", "type": "string", "size": 100},
    {"key": "storageRequirements", "type": "string", "size": 500},
    {"key": "isActive", "type": "boolean", "default": true}
  ],
  "indexes": [
    {"key": "name", "type": "fulltext"},
    {"key": "manufacturer", "type": "key"}
  ]
}
```

#### 4. Immunization Records Collection
```json
{
  "collectionId": "immunization_records",
  "name": "Immunization Records",
  "attributes": [
    {"key": "patientId", "type": "string", "size": 36, "required": true},
    {"key": "vaccineId", "type": "string", "size": 36, "required": true},
    {"key": "facilityId", "type": "string", "size": 36, "required": true},
    {"key": "administeredBy", "type": "string", "size": 36, "required": true},
    {"key": "dateAdministered", "type": "datetime", "required": true},
    {"key": "doseNumber", "type": "integer", "required": true},
    {"key": "batchNumber", "type": "string", "size": 100},
    {"key": "expirationDate", "type": "datetime"},
    {"key": "siteOfAdministration", "type": "string", "size": 100},
    {"key": "adverseEvents", "type": "string", "size": 1000},
    {"key": "notes", "type": "string", "size": 1000}
  ],
  "indexes": [
    {"key": "patientId", "type": "key"},
    {"key": "vaccineId", "type": "key"},
    {"key": "facilityId", "type": "key"},
    {"key": "dateAdministered", "type": "key"},
    {"key": "administeredBy", "type": "key"}
  ]
}
```

#### 5. Notifications Collection
```json
{
  "collectionId": "notifications",
  "name": "Notifications",
  "attributes": [
    {"key": "patientId", "type": "string", "size": 36, "required": true},
    {"key": "vaccineId", "type": "string", "size": 36, "required": true},
    {"key": "facilityId", "type": "string", "size": 36, "required": true},
    {"key": "type", "type": "enum", "elements": ["due", "overdue", "reminder"], "required": true},
    {"key": "status", "type": "enum", "elements": ["pending", "viewed", "completed"], "default": "pending"},
    {"key": "dueDate", "type": "datetime", "required": true},
    {"key": "message", "type": "string", "size": 1000},
    {"key": "priority", "type": "enum", "elements": ["low", "medium", "high"], "default": "medium"}
  ],
  "indexes": [
    {"key": "patientId", "type": "key"},
    {"key": "status", "type": "key"},
    {"key": "dueDate", "type": "key"},
    {"key": "priority", "type": "key"}
  ]
}
```

### MCP Server Integration

#### Using Appwrite MCP Server
```javascript
// Example of creating collections using MCP server
const collections = [
  {
    collectionId: 'patients',
    name: 'Patients',
    // ... collection definition
  },
  // ... other collections
];

// Create collections programmatically
for (const collection of collections) {
  await mcpServer.databases.createCollection(
    'immune-me-db',
    collection.collectionId,
    collection.name,
    collection.permissions
  );
  
  // Add attributes
  for (const attribute of collection.attributes) {
    await mcpServer.databases.createAttribute(
      'immune-me-db',
      collection.collectionId,
      attribute
    );
  }
  
  // Create indexes
  for (const index of collection.indexes) {
    await mcpServer.databases.createIndex(
      'immune-me-db',
      collection.collectionId,
      index.key,
      index.type,
      index.attributes
    );
  }
}
```

### Permission Configuration
```javascript
// Collection-level permissions
const permissions = {
  read: ['role:healthcare_worker', 'role:admin'],
  write: ['role:healthcare_worker', 'role:admin'],
  create: ['role:healthcare_worker', 'role:admin'],
  update: ['role:healthcare_worker', 'role:admin'],
  delete: ['role:admin']
};
```

## Files to Create/Modify
- `appwrite-backend/schemas/collections.json` - Collection definitions
- `appwrite-backend/schemas/create-collections.js` - MCP server script to create collections
- `appwrite-backend/schemas/permissions.json` - Permission configurations
- `appwrite-backend/schemas/indexes.json` - Index definitions
- `appwrite-backend/schemas/validation-rules.json` - Data validation rules
- `appwrite-backend/utils/mcp-client.js` - MCP server client utility
- `appwrite-backend/schemas/README.md` - Schema documentation

## Testing Requirements

### Collection Creation Testing
1. **MCP Server Connection Test**
   ```javascript
   // Test MCP server connectivity
   const health = await mcpServer.health.get();
   console.log('MCP Server Status:', health);
   ```

2. **Collection Creation Verification**
   ```javascript
   // Verify all collections exist
   const collections = await mcpServer.databases.listCollections('immune-me-db');
   const expectedCollections = ['patients', 'facilities', 'vaccines', 'immunization_records', 'notifications'];
   
   for (const expected of expectedCollections) {
     const exists = collections.collections.find(c => c.$id === expected);
     assert(exists, `Collection ${expected} not found`);
   }
   ```

3. **Attribute Validation**
   ```javascript
   // Test attribute creation and types
   const patientCollection = await mcpServer.databases.getCollection('immune-me-db', 'patients');
   const requiredAttributes = ['fullName', 'sex', 'dateOfBirth', 'district', 'facilityId'];
   
   for (const attr of requiredAttributes) {
     const attribute = patientCollection.attributes.find(a => a.key === attr);
     assert(attribute, `Required attribute ${attr} not found`);
     assert(attribute.required, `Attribute ${attr} should be required`);
   }
   ```

### Data Operations Testing
1. **CRUD Operations**
   ```javascript
   // Test basic CRUD operations
   const testPatient = {
     fullName: 'Test Patient',
     sex: 'M',
     dateOfBirth: new Date().toISOString(),
     district: 'Test District',
     facilityId: 'test-facility-id'
   };
   
   // Create
   const created = await mcpServer.databases.createDocument('immune-me-db', 'patients', 'unique()', testPatient);
   
   // Read
   const retrieved = await mcpServer.databases.getDocument('immune-me-db', 'patients', created.$id);
   
   // Update
   const updated = await mcpServer.databases.updateDocument('immune-me-db', 'patients', created.$id, {
     fullName: 'Updated Test Patient'
   });
   
   // Delete
   await mcpServer.databases.deleteDocument('immune-me-db', 'patients', created.$id);
   ```

2. **Query Testing**
   ```javascript
   // Test indexes and queries
   const patients = await mcpServer.databases.listDocuments('immune-me-db', 'patients', [
     Query.equal('district', 'Monrovia'),
     Query.limit(10)
   ]);
   ```

### Performance Testing
1. **Index Performance**
   - Test query performance with and without indexes
   - Verify index usage in query execution plans

2. **Bulk Operations**
   - Test bulk document creation
   - Verify performance with large datasets

## Implementation Steps

### Phase 1: Schema Design
1. Analyze existing PostgreSQL schema
2. Design Appwrite collections structure
3. Define attributes and data types
4. Plan indexes for optimal performance

### Phase 2: MCP Server Setup
1. Configure Appwrite MCP server connection
2. Create utility functions for collection management
3. Test MCP server connectivity and permissions

### Phase 3: Collection Creation
1. Create database collections using MCP server
2. Add attributes to each collection
3. Create indexes for performance optimization
4. Configure collection-level permissions

### Phase 4: Validation and Testing
1. Test all CRUD operations
2. Verify data validation rules
3. Test query performance
4. Validate real-time subscriptions

## Success Metrics
- All collections created successfully
- CRUD operations functional for all collections
- Query performance meets requirements
- Real-time subscriptions working
- Data validation rules enforced
- MCP server integration stable

## Rollback Plan
- Keep existing PostgreSQL database operational
- Document all collection IDs and configurations
- Maintain ability to recreate collections if needed
- Test rollback procedures in development environment

## Next Steps
After completion, this task enables:
- BE-AW-03: Authentication system migration
- BE-AW-04: Notification functions creation
- BE-AW-05: Reporting functions creation
- All frontend integration tasks