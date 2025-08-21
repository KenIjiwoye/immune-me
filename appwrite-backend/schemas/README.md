# Database Schemas

This directory contains database collection schemas and validation rules for the Appwrite backend implementation.

## Overview

Appwrite uses a NoSQL document-based database system. This directory defines the structure, validation rules, and relationships for all collections used in the Immune Me application.

## Collection Categories

### Core Entities
- **Users**: Healthcare workers, administrators, and system users
- **Facilities**: Healthcare facilities and clinics
- **Patients**: Patient records and demographic information
- **Vaccines**: Vaccine definitions and metadata
- **Immunization Records**: Individual immunization events and history

### System Entities
- **Notifications**: System notifications and alerts
- **Reports**: Generated reports and analytics data
- **Audit Logs**: System activity and change tracking
- **Settings**: Application configuration and preferences

### Reference Data
- **Vaccine Schedules**: Standard immunization schedules by age/condition
- **Schedule Items**: Individual schedule entries and requirements
- **Supplementary Immunizations**: Campaign and outbreak response data

## Schema Files

Each collection should have corresponding files:

- `<collection-name>.schema.json` - Collection structure and field definitions
- `<collection-name>.permissions.json` - Access control and security rules
- `<collection-name>.indexes.json` - Database indexes for performance optimization
- `<collection-name>.validation.json` - Data validation rules and constraints

## Schema Structure

### Collection Definition Format
```json
{
  "name": "collection_name",
  "documentSecurity": true,
  "attributes": [
    {
      "key": "field_name",
      "type": "string|integer|float|boolean|datetime|email|url",
      "status": "available",
      "required": true,
      "array": false,
      "size": 255,
      "default": null
    }
  ],
  "indexes": [
    {
      "key": "index_name",
      "type": "key|fulltext|unique",
      "attributes": ["field1", "field2"]
    }
  ]
}
```

### Permission Rules Format
```json
{
  "permissions": {
    "read": ["role:admin", "role:healthcare_worker"],
    "create": ["role:admin", "role:healthcare_worker"],
    "update": ["role:admin", "user:self"],
    "delete": ["role:admin"]
  },
  "documentPermissions": {
    "read": ["user:self", "role:healthcare_worker"],
    "update": ["user:self"],
    "delete": ["role:admin"]
  }
}
```

## Key Design Principles

### Data Modeling
- **Denormalization**: Optimize for read performance by embedding related data
- **Document References**: Use document IDs for relationships between collections
- **Flexible Schema**: Design for evolving requirements while maintaining data integrity

### Security
- **Role-Based Access**: Define clear roles (admin, healthcare_worker, patient)
- **Document-Level Security**: Implement fine-grained permissions per document
- **Data Isolation**: Ensure facility-based data isolation where required

### Performance
- **Strategic Indexing**: Create indexes for common query patterns
- **Query Optimization**: Design schemas to support efficient queries
- **Pagination Support**: Structure data for effective pagination

## Migration Considerations

### From PostgreSQL
- **Relational to Document**: Convert normalized tables to document collections
- **Foreign Keys**: Replace with document references or embedded data
- **Joins**: Implement through application logic or denormalization
- **Transactions**: Use Appwrite's document-level consistency

### Data Types Mapping
- `VARCHAR/TEXT` → `string`
- `INTEGER/BIGINT` → `integer`
- `DECIMAL/NUMERIC` → `float`
- `BOOLEAN` → `boolean`
- `TIMESTAMP` → `datetime`
- `JSON/JSONB` → Native document structure

## Validation Rules

### Common Patterns
- **Email Validation**: Use built-in email attribute type
- **Date Ranges**: Implement through custom validation functions
- **Enum Values**: Use string attributes with allowed values
- **Required Fields**: Mark essential fields as required
- **Data Formats**: Validate phone numbers, IDs, and other formatted data

### Custom Validators
- Patient ID format validation
- Vaccine code validation
- Date logical validation (birth date < immunization date)
- Facility assignment validation

## Collection Relationships

### One-to-Many
- Facility → Users (healthcare workers)
- Patient → Immunization Records
- Vaccine → Immunization Records

### Many-to-Many
- Users ↔ Facilities (through user facility assignment)
- Vaccines ↔ Schedules (through schedule items)

### Embedded Documents
- Patient contact information
- Immunization record details
- Notification metadata

## Deployment

Schemas are deployed using the Appwrite CLI:

```bash
# Deploy all collections
appwrite deploy collection

# Deploy specific collection
appwrite deploy collection --collectionId=<collection-id>
```

## Best Practices

1. **Consistent Naming**: Use snake_case for field names
2. **Documentation**: Include field descriptions and examples
3. **Versioning**: Track schema changes and migrations
4. **Testing**: Validate schemas with sample data
5. **Performance**: Monitor query performance and optimize indexes
6. **Security**: Regularly review and update permission rules