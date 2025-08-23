# Appwrite Collection Setup Scripts

This directory contains scripts for setting up Appwrite collections based on the existing PostgreSQL schema structure for the BE-AW-02 database schema ticket.

## Overview

The scripts in this directory provide a complete solution for migrating from PostgreSQL to Appwrite's NoSQL document-based approach while maintaining data integrity and query performance.

## Files Structure

```
scripts/
├── setup-collections.js          # Main collection creation script
├── mcp-collection-creator.js     # MCP server integration script
├── create-collections.js         # Legacy collection creation script
├── package.json                  # Dependencies and scripts
├── README.md                     # This documentation
└── tests/                        # Test files (to be created)
```

## Prerequisites

1. **Appwrite Server**: Ensure Appwrite is running and accessible
2. **Environment Variables**: Set the following in your `.env` file:
   ```bash
   APPWRITE_PROJECT_ID=your-project-id
   APPWRITE_DATABASE_ID=your-database-id
   APPWRITE_ENDPOINT=http://localhost/v1
   APPWRITE_API_KEY=your-api-key
   ```

3. **Node.js**: Version 14 or higher
4. **Dependencies**: Install with `npm install`

## Installation

```bash
cd appwrite-backend/scripts
npm install
```

## Usage

### Basic Setup
```bash
# Create all collections
npm run setup

# Create collections and run tests
npm run setup:test
```

### MCP Server Integration
```bash
# Use MCP server for collection creation
npm run mcp:setup

# Run with tests
npm run mcp:test
```

### Manual Execution
```bash
# Direct script execution
node setup-collections.js --test --verbose

# Help
node setup-collections.js --help
```

## Collection Schema

The following collections are created based on the existing PostgreSQL schema:

### 1. Facilities
- **Purpose**: Store healthcare facility information
- **Key Attributes**: name, district, address, contact information
- **Indexes**: district, name, created_at

### 2. Patients
- **Purpose**: Store patient demographic and medical information
- **Key Attributes**: full_name, sex, date_of_birth, district, facility_id
- **Indexes**: facility_id, district, date_of_birth

### 3. Vaccines
- **Purpose**: Store vaccine catalog and information
- **Key Attributes**: name, vaccine_code, manufacturer, is_active
- **Indexes**: vaccine_code, is_active

### 4. Immunization Records
- **Purpose**: Store vaccination history
- **Key Attributes**: patient_id, vaccine_id, facility_id, date_given, dose_number
- **Indexes**: patient_id, vaccine_id, facility_id, date_given

### 5. Notifications
- **Purpose**: Store system notifications and alerts
- **Key Attributes**: patient_id, type, message, status, scheduled_date
- **Indexes**: patient_id, status, scheduled_date

### 6. Vaccine Schedules
- **Purpose**: Store vaccination schedules and plans
- **Key Attributes**: patient_id, vaccine_id, scheduled_date, status
- **Indexes**: patient_id, vaccine_id, scheduled_date

### 7. Vaccine Schedule Items
- **Purpose**: Store individual schedule items
- **Key Attributes**: schedule_id, dose_number, due_date, status
- **Indexes**: schedule_id, due_date, status

### 8. Supplementary Immunizations
- **Purpose**: Store additional immunization records
- **Key Attributes**: patient_id, vaccine_name, date_given, facility_id
- **Indexes**: patient_id, facility_id, date_given

## Permissions Configuration

Each collection has the following permission structure:

```javascript
{
  read: ["role:admin", "role:healthcare_worker"],
  create: ["role:admin", "role:healthcare_worker"],
  update: ["role:admin", "role:healthcare_worker"],
  delete: ["role:admin"]
}
```

## Indexes for Performance

The following indexes are created for optimal query performance:

### Common Indexes
- `created_at` - For chronological queries
- `updated_at` - For recent changes
- `facility_id` - For facility-based filtering

### Collection-Specific Indexes
- **Patients**: `district`, `date_of_birth`, `facility_id`
- **Immunization Records**: `patient_id`, `vaccine_id`, `date_given`
- **Notifications**: `patient_id`, `status`, `scheduled_date`

## Data Validation Rules

Each collection includes validation rules:

1. **Required Fields**: Marked as required in schema
2. **Data Types**: Enforced at collection level
3. **Value Constraints**: Min/max values for numeric fields
4. **Format Validation**: Email, phone, date formats
5. **Enum Values**: Restricted to predefined values

## Real-time Subscriptions

The following collections support real-time subscriptions:

- **Immunization Records**: For tracking vaccination updates
- **Notifications**: For real-time alerts
- **Patients**: For patient record changes
- **Vaccine Schedules**: For schedule updates

## Testing

### Automated Tests
```bash
# Run all tests
npm test

# Run specific test suite
npm run test:crud
npm run test:permissions
npm run test:performance
```

### Manual Testing
1. **Collection Creation**: Verify all collections exist in Appwrite Console
2. **CRUD Operations**: Test create, read, update, delete for each collection
3. **Permissions**: Test access control with different user roles
4. **Indexes**: Verify query performance with large datasets
5. **Real-time**: Test subscription functionality

## Migration from PostgreSQL

### Data Type Mapping
| PostgreSQL | Appwrite |
|------------|----------|
| SERIAL | string (ID) |
| VARCHAR | string |
| INTEGER | integer |
| BOOLEAN | boolean |
| TIMESTAMP | datetime |
| TEXT | string (larger size) |
| JSON | object (as string) |

### Schema Differences
1. **No Foreign Keys**: Use string references instead
2. **No Joins**: Use denormalized data or multiple queries
3. **Flexible Schema**: Attributes can be added dynamically
4. **Document-based**: Nested objects supported

## Troubleshooting

### Common Issues

1. **Permission Denied**
   - Check API key permissions
   - Verify project and database IDs

2. **Collection Already Exists**
   - Use `--force` flag to recreate
   - Manually delete existing collections

3. **Attribute Creation Fails**
   - Check attribute type compatibility
   - Verify required fields

4. **Index Creation Fails**
   - Ensure attributes exist before creating indexes
   - Check index type compatibility

### Debug Mode
```bash
# Enable verbose logging
DEBUG=appwrite:* node setup-collections.js --verbose
```

## Performance Optimization

### Query Optimization
- Use appropriate indexes for frequent queries
- Limit result sets with pagination
- Use projection to return only needed fields

### Data Modeling
- Denormalize data for read-heavy operations
- Use embedded documents for related data
- Consider data access patterns

## Security Considerations

1. **API Key Management**: Store securely, rotate regularly
2. **Permission Granularity**: Use role-based access control
3. **Data Validation**: Implement at collection level
4. **Audit Logging**: Track all data modifications
5. **Encryption**: Use HTTPS endpoints

## Monitoring

### Collection Metrics
- Document count per collection
- Query performance metrics
- Error rates and types

### Health Checks
```bash
# Check collection health
npm run health:check

# Monitor performance
npm run monitor:performance
```

## Future Enhancements

1. **Automated Backups**: Scheduled collection backups
2. **Data Migration**: PostgreSQL to Appwrite migration scripts
3. **Performance Monitoring**: Real-time performance metrics
4. **Schema Evolution**: Automated schema updates
5. **Integration Tests**: End-to-end testing suite

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review Appwrite documentation
3. Create an issue in the project repository
4. Contact the development team

## License

MIT License - See LICENSE file for details