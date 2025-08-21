# Data Migration Scripts and Procedures

This directory contains data migration scripts, procedures, and utilities for migrating data from existing systems to the Appwrite backend implementation.

## Overview

Migration scripts facilitate the transition from the current AdonisJS/PostgreSQL backend to the Appwrite backend. These scripts handle data transformation, validation, and transfer while maintaining data integrity and minimizing downtime.

## Migration Categories

### Database Migration (`database/`)
- **Schema Migration**: Scripts to create Appwrite collections from PostgreSQL tables
- **Data Transfer**: Scripts to migrate existing data to Appwrite collections
- **Relationship Mapping**: Scripts to handle foreign key relationships in document format
- **Index Creation**: Scripts to create appropriate indexes for performance

### User Migration (`users/`)
- **User Account Transfer**: Scripts to migrate user accounts and authentication data
- **Role Assignment**: Scripts to map existing roles to Appwrite role system
- **Permission Migration**: Scripts to transfer user permissions and access levels
- **Session Management**: Scripts to handle active user sessions during migration

### File Migration (`files/`)
- **Document Transfer**: Scripts to migrate patient documents and files
- **Storage Bucket Setup**: Scripts to create and configure Appwrite storage buckets
- **File Validation**: Scripts to validate file integrity during transfer
- **Access Control**: Scripts to set appropriate file permissions

### Configuration Migration (`config/`)
- **Settings Transfer**: Scripts to migrate application settings and configurations
- **Environment Setup**: Scripts to configure Appwrite environment variables
- **Integration Config**: Scripts to migrate external service configurations
- **Notification Setup**: Scripts to configure notification channels and templates

## Migration Strategy

### Phase 1: Preparation
1. **Data Assessment**: Analyze existing data structure and volume
2. **Schema Mapping**: Map PostgreSQL tables to Appwrite collections
3. **Validation Rules**: Define data validation and transformation rules
4. **Backup Creation**: Create comprehensive backups of existing data

### Phase 2: Schema Migration
1. **Collection Creation**: Create Appwrite collections with proper schemas
2. **Index Setup**: Create necessary indexes for performance
3. **Permission Configuration**: Set up collection-level permissions
4. **Validation Testing**: Test schema with sample data

### Phase 3: Data Migration
1. **Incremental Transfer**: Migrate data in batches to minimize impact
2. **Data Transformation**: Transform relational data to document format
3. **Relationship Handling**: Establish document references for relationships
4. **Validation Checks**: Validate migrated data integrity

### Phase 4: Verification
1. **Data Integrity**: Verify all data has been migrated correctly
2. **Performance Testing**: Test query performance with migrated data
3. **Functional Testing**: Ensure all application features work with new data
4. **Rollback Preparation**: Prepare rollback procedures if needed

## Migration Scripts

### Main Migration Script
```typescript
// migrate.ts - Main migration orchestrator
import { migrateUsers } from './users/migrate-users';
import { migratePatients } from './patients/migrate-patients';
import { migrateImmunizations } from './immunizations/migrate-immunizations';
import { migrateFacilities } from './facilities/migrate-facilities';
import { migrateVaccines } from './vaccines/migrate-vaccines';

export interface MigrationOptions {
  batchSize: number;
  dryRun: boolean;
  skipValidation: boolean;
  continueOnError: boolean;
}

export async function runMigration(options: MigrationOptions = {
  batchSize: 100,
  dryRun: false,
  skipValidation: false,
  continueOnError: false
}) {
  console.log('Starting migration process...');
  
  try {
    // Phase 1: Migrate reference data
    await migrateVaccines(options);
    await migrateFacilities(options);
    
    // Phase 2: Migrate users
    await migrateUsers(options);
    
    // Phase 3: Migrate patient data
    await migratePatients(options);
    
    // Phase 4: Migrate immunization records
    await migrateImmunizations(options);
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}
```

### Data Transformation Utilities
```typescript
// utils/transformers.ts
export const transformPatientData = (pgPatient: any) => {
  return {
    patientId: pgPatient.patient_id,
    firstName: pgPatient.first_name,
    lastName: pgPatient.last_name,
    birthDate: pgPatient.birth_date.toISOString(),
    gender: pgPatient.gender,
    contactInfo: {
      phone: pgPatient.phone,
      email: pgPatient.email,
      address: {
        street: pgPatient.address_street,
        city: pgPatient.address_city,
        state: pgPatient.address_state,
        postalCode: pgPatient.address_postal_code,
        country: pgPatient.address_country || 'Liberia'
      }
    },
    facilityId: pgPatient.facility_id,
    medicalInfo: {
      allergies: pgPatient.allergies ? pgPatient.allergies.split(',') : [],
      medicalConditions: pgPatient.medical_conditions ? pgPatient.medical_conditions.split(',') : [],
      medications: pgPatient.medications ? pgPatient.medications.split(',') : [],
      notes: pgPatient.medical_notes
    },
    isActive: pgPatient.is_active
  };
};

export const transformImmunizationData = (pgRecord: any) => {
  return {
    patientId: pgRecord.patient_id,
    vaccineId: pgRecord.vaccine_id,
    administeredDate: pgRecord.administered_date.toISOString(),
    doseNumber: pgRecord.dose_number,
    administeredBy: pgRecord.administered_by,
    facilityId: pgRecord.facility_id,
    batchNumber: pgRecord.batch_number,
    expirationDate: pgRecord.expiration_date?.toISOString(),
    administrationSite: pgRecord.administration_site || 'left_arm',
    route: pgRecord.route || 'intramuscular',
    notes: pgRecord.notes,
    isValid: pgRecord.is_valid !== false
  };
};
```

### Batch Processing Utilities
```typescript
// utils/batch-processor.ts
export class BatchProcessor<T> {
  constructor(
    private batchSize: number = 100,
    private processor: (batch: T[]) => Promise<void>
  ) {}

  async process(items: T[]): Promise<void> {
    const batches = this.createBatches(items);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} items)`);
      
      try {
        await this.processor(batch);
        console.log(`Batch ${i + 1} completed successfully`);
      } catch (error) {
        console.error(`Batch ${i + 1} failed:`, error);
        throw error;
      }
    }
  }

  private createBatches(items: T[]): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += this.batchSize) {
      batches.push(items.slice(i, i + this.batchSize));
    }
    return batches;
  }
}
```

### Validation Utilities
```typescript
// utils/validators.ts
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const validatePatientData = (patient: any): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields validation
  if (!patient.patientId) errors.push('Patient ID is required');
  if (!patient.firstName) errors.push('First name is required');
  if (!patient.lastName) errors.push('Last name is required');
  if (!patient.birthDate) errors.push('Birth date is required');
  if (!patient.facilityId) errors.push('Facility ID is required');

  // Data format validation
  if (patient.birthDate && !isValidDate(patient.birthDate)) {
    errors.push('Invalid birth date format');
  }

  // Business logic validation
  if (patient.birthDate && new Date(patient.birthDate) > new Date()) {
    errors.push('Birth date cannot be in the future');
  }

  // Warnings for missing optional data
  if (!patient.contactInfo?.phone && !patient.contactInfo?.email) {
    warnings.push('No contact information provided');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

const isValidDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};
```

## Migration Procedures

### Pre-Migration Checklist
- [ ] Backup existing PostgreSQL database
- [ ] Set up Appwrite project and configure collections
- [ ] Test migration scripts with sample data
- [ ] Verify network connectivity between systems
- [ ] Prepare rollback procedures
- [ ] Schedule maintenance window
- [ ] Notify stakeholders of migration timeline

### Migration Execution Steps
1. **Stop Application Services**: Temporarily stop the application to prevent data changes
2. **Final Backup**: Create a final backup of the current database
3. **Run Migration**: Execute migration scripts with monitoring
4. **Validate Data**: Run validation checks on migrated data
5. **Test Application**: Perform functional testing with migrated data
6. **Switch Traffic**: Update application configuration to use Appwrite
7. **Monitor System**: Monitor system performance and error rates

### Post-Migration Tasks
- [ ] Verify all data has been migrated correctly
- [ ] Test all application features
- [ ] Monitor system performance
- [ ] Update documentation and procedures
- [ ] Train team on new system
- [ ] Plan for old system decommissioning

## Rollback Procedures

### Rollback Triggers
- Data integrity issues discovered
- Critical application functionality broken
- Performance degradation beyond acceptable limits
- Security vulnerabilities identified

### Rollback Steps
1. **Stop New System**: Immediately stop Appwrite-based application
2. **Restore Database**: Restore PostgreSQL database from backup
3. **Restart Old System**: Start the original AdonisJS application
4. **Verify Functionality**: Ensure all features work correctly
5. **Investigate Issues**: Analyze what went wrong with migration
6. **Plan Remediation**: Develop plan to fix migration issues

## Monitoring and Logging

### Migration Monitoring
```typescript
// utils/migration-monitor.ts
export class MigrationMonitor {
  private startTime: Date;
  private stats: MigrationStats = {
    totalRecords: 0,
    processedRecords: 0,
    successfulRecords: 0,
    failedRecords: 0,
    errors: []
  };

  start() {
    this.startTime = new Date();
    console.log(`Migration started at ${this.startTime.toISOString()}`);
  }

  recordSuccess(count: number = 1) {
    this.stats.processedRecords += count;
    this.stats.successfulRecords += count;
  }

  recordFailure(error: string, count: number = 1) {
    this.stats.processedRecords += count;
    this.stats.failedRecords += count;
    this.stats.errors.push(error);
  }

  getProgress(): number {
    return this.stats.totalRecords > 0 
      ? (this.stats.processedRecords / this.stats.totalRecords) * 100 
      : 0;
  }

  getSummary(): MigrationSummary {
    const endTime = new Date();
    const duration = endTime.getTime() - this.startTime.getTime();

    return {
      startTime: this.startTime,
      endTime,
      duration,
      stats: this.stats,
      successRate: this.stats.processedRecords > 0 
        ? (this.stats.successfulRecords / this.stats.processedRecords) * 100 
        : 0
    };
  }
}

interface MigrationStats {
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  errors: string[];
}

interface MigrationSummary {
  startTime: Date;
  endTime: Date;
  duration: number;
  stats: MigrationStats;
  successRate: number;
}
```

## File Organization

### Directory Structure
```
migrations/
├── database/
│   ├── create-collections.ts
│   ├── create-indexes.ts
│   └── setup-permissions.ts
├── users/
│   ├── migrate-users.ts
│   ├── migrate-roles.ts
│   └── migrate-sessions.ts
├── patients/
│   ├── migrate-patients.ts
│   ├── migrate-guardians.ts
│   └── validate-patients.ts
├── immunizations/
│   ├── migrate-records.ts
│   ├── migrate-schedules.ts
│   └── validate-records.ts
├── facilities/
│   ├── migrate-facilities.ts
│   └── validate-facilities.ts
├── vaccines/
│   ├── migrate-vaccines.ts
│   └── validate-vaccines.ts
├── files/
│   ├── migrate-documents.ts
│   └── setup-storage.ts
├── config/
│   ├── migrate-settings.ts
│   └── setup-notifications.ts
├── utils/
│   ├── transformers.ts
│   ├── validators.ts
│   ├── batch-processor.ts
│   ├── migration-monitor.ts
│   └── database-connections.ts
├── scripts/
│   ├── pre-migration-check.ts
│   ├── post-migration-verify.ts
│   └── rollback.ts
├── migrate.ts
└── README.md
```

## Best Practices

### Data Safety
1. **Always Backup**: Create comprehensive backups before migration
2. **Dry Run**: Always test migrations with dry run mode first
3. **Incremental Migration**: Migrate data in small batches
4. **Validation**: Validate data at every step of the process

### Performance
1. **Batch Processing**: Process data in appropriately sized batches
2. **Connection Pooling**: Use connection pooling for database operations
3. **Parallel Processing**: Use parallel processing where safe
4. **Resource Monitoring**: Monitor system resources during migration

### Error Handling
1. **Comprehensive Logging**: Log all operations and errors
2. **Graceful Degradation**: Handle errors gracefully without stopping entire migration
3. **Retry Logic**: Implement retry logic for transient failures
4. **Error Recovery**: Provide mechanisms to recover from partial failures

### Documentation
1. **Migration Log**: Maintain detailed logs of migration process
2. **Data Mapping**: Document how data is transformed during migration
3. **Rollback Procedures**: Document clear rollback procedures
4. **Lessons Learned**: Document issues encountered and solutions

## Usage Examples

### Running a Complete Migration
```bash
# Dry run to test migration
npm run migrate -- --dry-run --batch-size=50

# Run actual migration
npm run migrate -- --batch-size=100

# Run migration with error continuation
npm run migrate -- --continue-on-error --batch-size=100
```

### Running Specific Migration Components
```bash
# Migrate only users
npm run migrate:users

# Migrate only patients
npm run migrate:patients

# Validate migrated data
npm run migrate:validate
```

### Monitoring Migration Progress
```bash
# Check migration status
npm run migrate:status

# View migration logs
npm run migrate:logs

# Generate migration report
npm run migrate:report