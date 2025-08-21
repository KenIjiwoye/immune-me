# Appwrite Schema Setup Guide

This guide provides step-by-step instructions for setting up the Immune Me database collections using the Appwrite MCP server and the provided schema files.

## Prerequisites

1. **Appwrite MCP Server**: Ensure the Appwrite MCP server is properly configured and connected
2. **Appwrite Project**: Have an active Appwrite project with appropriate permissions
3. **Schema Files**: All schema JSON files should be present in the `appwrite-backend/schemas/` directory

## Schema Files Overview

The following schema files define the complete database structure:

- [`facilities.json`](facilities.json) - Healthcare facilities and clinics
- [`patients.json`](patients.json) - Patient records and demographic information
- [`vaccines.json`](vaccines.json) - Vaccine definitions and metadata
- [`immunization-records.json`](immunization-records.json) - Individual immunization events
- [`notifications.json`](notifications.json) - System notifications and alerts
- [`vaccine-schedules.json`](vaccine-schedules.json) - Standard immunization schedules
- [`vaccine-schedule-items.json`](vaccine-schedule-items.json) - Individual schedule entries
- [`supplementary-immunizations.json`](supplementary-immunizations.json) - Campaign and outbreak response data

## Setup Instructions

### Step 1: Verify MCP Server Connection

Ensure the Appwrite MCP server is connected and accessible. You should be able to use Appwrite tools through the MCP interface.

### Step 2: Create Collections in Order

**IMPORTANT**: Collections must be created in the correct order due to relationship dependencies.

#### Phase 1: Core Independent Collections

1. **Facilities Collection**
   ```json
   // Use the facilities.json schema
   // No dependencies - can be created first
   ```

2. **Vaccines Collection**
   ```json
   // Use the vaccines.json schema
   // No dependencies - can be created first
   ```

3. **Vaccine Schedules Collection**
   ```json
   // Use the vaccine-schedules.json schema
   // No dependencies - can be created first
   ```

#### Phase 2: Dependent Collections

4. **Patients Collection**
   ```json
   // Use the patients.json schema
   // Depends on: facilities
   ```

5. **Vaccine Schedule Items Collection**
   ```json
   // Use the vaccine-schedule-items.json schema
   // Depends on: vaccine_schedules, vaccines
   ```

#### Phase 3: Transaction Collections

6. **Immunization Records Collection**
   ```json
   // Use the immunization-records.json schema
   // Depends on: patients, vaccines, facilities, users
   ```

7. **Notifications Collection**
   ```json
   // Use the notifications.json schema
   // Depends on: patients, vaccines, facilities
   ```

8. **Supplementary Immunizations Collection**
   ```json
   // Use the supplementary-immunizations.json schema
   // Depends on: vaccines, facilities, users
   ```

### Step 3: Using Appwrite MCP Server Tools

For each collection, you'll need to use the appropriate MCP tools. Here's the general process:

#### Creating a Collection

1. **Parse the Schema File**: Load the JSON schema file content
2. **Create Collection**: Use MCP tools to create the collection with basic settings
3. **Add Attributes**: Create each attribute defined in the schema
4. **Create Indexes**: Set up performance indexes
5. **Configure Permissions**: Apply security rules

#### Example MCP Tool Usage Pattern

```javascript
// Example for creating facilities collection
// 1. Create the collection first
// 2. Add each attribute from the schema
// 3. Create indexes for performance
// 4. Set up permissions
```

### Step 4: Attribute Type Mapping

When creating attributes, use these type mappings from PostgreSQL to Appwrite:

| PostgreSQL Type | Appwrite Type | Notes |
|----------------|---------------|-------|
| `VARCHAR/TEXT` | `string` | Set appropriate size limits |
| `INTEGER/BIGINT` | `integer` | For numeric IDs and counts |
| `DECIMAL/NUMERIC` | `float` | For decimal values |
| `BOOLEAN` | `boolean` | For true/false values |
| `TIMESTAMP/DATE` | `datetime` | For dates and timestamps |
| `JSON/JSONB` | `string` | Store as JSON string or use nested attributes |

### Step 5: Validation Rules

Each schema includes validation rules that should be implemented:

- **Required Fields**: Mark essential fields as required
- **String Length**: Set min/max length constraints
- **Pattern Validation**: Use regex patterns for formatted data
- **Enum Values**: Restrict values to predefined options
- **Unique Constraints**: Ensure uniqueness where needed

### Step 6: Index Creation

Create indexes for:
- **Primary Keys**: Automatic in Appwrite
- **Foreign Keys**: For relationship performance
- **Query Fields**: Fields used in WHERE clauses
- **Compound Indexes**: For multi-field queries
- **Full-text Search**: For text search capabilities

### Step 7: Permission Configuration

Set up role-based permissions:

#### Roles
- `role:admin` - Full access to all collections
- `role:healthcare_worker` - Read/write access to operational data
- `role:patient` - Limited read access to own data

#### Permission Patterns
- **Read**: Admin and healthcare workers can read all data
- **Create**: Admin and healthcare workers can create records
- **Update**: Admin and healthcare workers can update records
- **Delete**: Only admins can delete records

### Step 8: Relationship Setup

While Appwrite doesn't enforce foreign key constraints like PostgreSQL, document the relationships for application logic:

- Use document IDs as reference fields
- Implement relationship validation in application code
- Consider denormalization for performance-critical queries

## Validation and Testing

### Step 9: Schema Validation

After creating all collections:

1. **Verify Structure**: Ensure all attributes are created correctly
2. **Test Indexes**: Verify indexes are active and functioning
3. **Check Permissions**: Test role-based access controls
4. **Validate Relationships**: Ensure reference fields work correctly

### Step 10: Sample Data Testing

Create sample documents to test:

1. **Basic CRUD Operations**: Create, read, update, delete
2. **Relationship Queries**: Test cross-collection queries
3. **Validation Rules**: Verify data validation works
4. **Performance**: Test query performance with indexes

## Migration Considerations

### Data Migration from PostgreSQL

When migrating existing data:

1. **Export Data**: Extract data from PostgreSQL in JSON format
2. **Transform IDs**: Convert integer IDs to Appwrite document IDs
3. **Handle Relationships**: Update foreign key references
4. **Batch Import**: Use batch operations for large datasets
5. **Verify Integrity**: Ensure all relationships are maintained

### Schema Evolution

For future schema changes:

1. **Backup Data**: Always backup before schema changes
2. **Version Control**: Track schema versions
3. **Migration Scripts**: Create scripts for schema updates
4. **Testing**: Test changes in development environment first

## Troubleshooting

### Common Issues

1. **Attribute Creation Fails**
   - Check attribute name conflicts
   - Verify type compatibility
   - Ensure size limits are appropriate

2. **Index Creation Fails**
   - Verify attribute exists before creating index
   - Check for duplicate index names
   - Ensure compound index attribute order

3. **Permission Errors**
   - Verify role definitions exist
   - Check permission syntax
   - Ensure user has appropriate roles

4. **Relationship Issues**
   - Verify referenced collections exist
   - Check document ID formats
   - Ensure proper foreign key field types

### Best Practices

1. **Naming Conventions**: Use consistent snake_case naming
2. **Documentation**: Keep schema documentation updated
3. **Version Control**: Track all schema changes
4. **Testing**: Always test in development first
5. **Monitoring**: Monitor query performance and optimize as needed

## Next Steps

After completing the schema setup:

1. **Application Integration**: Update application code to use Appwrite
2. **Data Migration**: Migrate existing PostgreSQL data
3. **Testing**: Comprehensive testing of all functionality
4. **Performance Optimization**: Monitor and optimize query performance
5. **Security Review**: Audit permissions and access controls

## Support

For issues with:
- **Appwrite MCP Server**: Check MCP server documentation
- **Schema Definitions**: Review individual schema files
- **Relationships**: Consult [`relationships-map.md`](relationships-map.md)
- **Migration**: Follow PostgreSQL to Appwrite migration guides