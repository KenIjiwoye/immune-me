# Database Relationships Map

This document provides a comprehensive overview of all collection relationships and foreign key mappings in the Immune Me Appwrite database.

## Relationship Overview

The database follows a hierarchical structure with clear dependencies between collections. This document maps out all relationships to help understand data flow and query patterns.

## Collection Dependency Graph

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   facilities    │    │    vaccines     │    │vaccine_schedules│
│                 │    │                 │    │                 │
│ - id            │    │ - id            │    │ - id            │
│ - name          │    │ - name          │    │ - name          │
│ - district      │    │ - vaccine_code  │    │ - country       │
│ - address       │    │ - description   │    │ - description   │
│ - contact_phone │    │ - is_active     │    │ - is_active     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    patients     │    │vaccine_schedule │    │supplementary_   │
│                 │    │     _items      │    │ immunizations   │
│ - id            │    │                 │    │                 │
│ - full_name     │    │ - schedule_id   │    │ - vaccine_id    │
│ - facility_id   │◄───┤ - vaccine_id    │    │ - facility_id   │
│ - district      │    │ - recommended   │    │ - start_date    │
│ - date_of_birth │    │   _age          │    │ - end_date      │
└─────────────────┘    │ - sequence_in   │    │ - target_pop    │
         │              │   _schedule     │    └─────────────────┘
         │              └─────────────────┘
         ▼
┌─────────────────┐    ┌─────────────────┐
│immunization_    │    │  notifications  │
│    records      │    │                 │
│                 │    │ - patient_id    │
│ - patient_id    │◄───┤ - vaccine_id    │
│ - vaccine_id    │    │ - facility_id   │
│ - facility_id   │    │ - due_date      │
│ - administered  │    │ - status        │
│   _date         │    │ - priority      │
│ - batch_number  │    └─────────────────┘
└─────────────────┘
```

## Detailed Relationships

### 1. Facilities Collection

**Collection ID**: `facilities`

#### Outgoing Relationships (One-to-Many)
- **→ patients**: `facilities.id` → `patients.facility_id`
- **→ immunization_records**: `facilities.id` → `immunization_records.facility_id`
- **→ notifications**: `facilities.id` → `notifications.facility_id`
- **→ supplementary_immunizations**: `facilities.id` → `supplementary_immunizations.facility_id`

#### Relationship Details
```json
{
  "has_many": [
    {
      "collection": "patients",
      "foreign_key": "facility_id",
      "description": "Patients registered at this facility"
    },
    {
      "collection": "immunization_records", 
      "foreign_key": "facility_id",
      "description": "Immunizations administered at this facility"
    },
    {
      "collection": "notifications",
      "foreign_key": "facility_id", 
      "description": "Notifications for this facility"
    },
    {
      "collection": "supplementary_immunizations",
      "foreign_key": "facility_id",
      "description": "Supplementary campaigns at this facility"
    }
  ]
}
```

### 2. Patients Collection

**Collection ID**: `patients`

#### Incoming Relationships (Many-to-One)
- **facilities ←**: `patients.facility_id` ← `facilities.id`

#### Outgoing Relationships (One-to-Many)
- **→ immunization_records**: `patients.id` → `immunization_records.patient_id`
- **→ notifications**: `patients.id` → `notifications.patient_id`

#### Relationship Details
```json
{
  "belongs_to": [
    {
      "collection": "facilities",
      "foreign_key": "facility_id",
      "description": "Primary healthcare facility for this patient"
    }
  ],
  "has_many": [
    {
      "collection": "immunization_records",
      "foreign_key": "patient_id",
      "description": "All immunization records for this patient"
    },
    {
      "collection": "notifications", 
      "foreign_key": "patient_id",
      "description": "Notifications related to this patient"
    }
  ]
}
```

### 3. Vaccines Collection

**Collection ID**: `vaccines`

#### Outgoing Relationships (One-to-Many)
- **→ immunization_records**: `vaccines.id` → `immunization_records.vaccine_id`
- **→ notifications**: `vaccines.id` → `notifications.vaccine_id`
- **→ vaccine_schedule_items**: `vaccines.id` → `vaccine_schedule_items.vaccine_id`
- **→ supplementary_immunizations**: `vaccines.id` → `supplementary_immunizations.vaccine_id`

#### Relationship Details
```json
{
  "has_many": [
    {
      "collection": "immunization_records",
      "foreign_key": "vaccine_id",
      "description": "Records of this vaccine being administered"
    },
    {
      "collection": "notifications",
      "foreign_key": "vaccine_id",
      "description": "Notifications for this vaccine"
    },
    {
      "collection": "vaccine_schedule_items",
      "foreign_key": "vaccine_id", 
      "description": "Schedule items that include this vaccine"
    },
    {
      "collection": "supplementary_immunizations",
      "foreign_key": "vaccine_id",
      "description": "Supplementary campaigns for this vaccine"
    }
  ]
}
```

### 4. Immunization Records Collection

**Collection ID**: `immunization_records`

#### Incoming Relationships (Many-to-One)
- **patients ←**: `immunization_records.patient_id` ← `patients.id`
- **vaccines ←**: `immunization_records.vaccine_id` ← `vaccines.id`
- **facilities ←**: `immunization_records.facility_id` ← `facilities.id`
- **users ←**: `immunization_records.administered_by_user_id` ← `users.id`

#### Relationship Details
```json
{
  "belongs_to": [
    {
      "collection": "patients",
      "foreign_key": "patient_id",
      "description": "Patient who received the immunization"
    },
    {
      "collection": "vaccines",
      "foreign_key": "vaccine_id",
      "description": "Vaccine that was administered"
    },
    {
      "collection": "facilities",
      "foreign_key": "facility_id",
      "description": "Facility where immunization was given"
    },
    {
      "collection": "users",
      "foreign_key": "administered_by_user_id",
      "description": "Healthcare worker who administered the vaccine"
    }
  ]
}
```

### 5. Notifications Collection

**Collection ID**: `notifications`

#### Incoming Relationships (Many-to-One)
- **patients ←**: `notifications.patient_id` ← `patients.id`
- **vaccines ←**: `notifications.vaccine_id` ← `vaccines.id`
- **facilities ←**: `notifications.facility_id` ← `facilities.id`

#### Relationship Details
```json
{
  "belongs_to": [
    {
      "collection": "patients",
      "foreign_key": "patient_id",
      "description": "Patient this notification is for"
    },
    {
      "collection": "vaccines",
      "foreign_key": "vaccine_id",
      "description": "Vaccine this notification is about"
    },
    {
      "collection": "facilities",
      "foreign_key": "facility_id",
      "description": "Facility responsible for this notification"
    }
  ]
}
```

### 6. Vaccine Schedules Collection

**Collection ID**: `vaccine_schedules`

#### Outgoing Relationships (One-to-Many)
- **→ vaccine_schedule_items**: `vaccine_schedules.id` → `vaccine_schedule_items.schedule_id`

#### Relationship Details
```json
{
  "has_many": [
    {
      "collection": "vaccine_schedule_items",
      "foreign_key": "schedule_id",
      "description": "Individual vaccine items in this schedule"
    }
  ]
}
```

### 7. Vaccine Schedule Items Collection

**Collection ID**: `vaccine_schedule_items`

#### Incoming Relationships (Many-to-One)
- **vaccine_schedules ←**: `vaccine_schedule_items.schedule_id` ← `vaccine_schedules.id`
- **vaccines ←**: `vaccine_schedule_items.vaccine_id` ← `vaccines.id`

#### Relationship Details
```json
{
  "belongs_to": [
    {
      "collection": "vaccine_schedules",
      "foreign_key": "schedule_id",
      "description": "Schedule this item belongs to"
    },
    {
      "collection": "vaccines",
      "foreign_key": "vaccine_id",
      "description": "Vaccine defined in this schedule item"
    }
  ]
}
```

### 8. Supplementary Immunizations Collection

**Collection ID**: `supplementary_immunizations`

#### Incoming Relationships (Many-to-One)
- **vaccines ←**: `supplementary_immunizations.vaccine_id` ← `vaccines.id`
- **facilities ←**: `supplementary_immunizations.facility_id` ← `facilities.id`
- **users ←**: `supplementary_immunizations.created_by` ← `users.id`

#### Relationship Details
```json
{
  "belongs_to": [
    {
      "collection": "vaccines",
      "foreign_key": "vaccine_id",
      "description": "Vaccine used in this supplementary campaign"
    },
    {
      "collection": "facilities",
      "foreign_key": "facility_id",
      "description": "Facility conducting this campaign (optional)"
    },
    {
      "collection": "users",
      "foreign_key": "created_by",
      "description": "User who created this campaign"
    }
  ]
}
```

## Foreign Key Reference Table

| Source Collection | Source Field | Target Collection | Target Field | Relationship Type | Description |
|------------------|--------------|------------------|--------------|------------------|-------------|
| patients | facility_id | facilities | $id | Many-to-One | Patient's primary facility |
| patients | health_worker_id | users | $id | Many-to-One | Assigned healthcare worker |
| immunization_records | patient_id | patients | $id | Many-to-One | Patient who received vaccine |
| immunization_records | vaccine_id | vaccines | $id | Many-to-One | Vaccine administered |
| immunization_records | facility_id | facilities | $id | Many-to-One | Facility where administered |
| immunization_records | administered_by_user_id | users | $id | Many-to-One | Healthcare worker who administered |
| notifications | patient_id | patients | $id | Many-to-One | Patient for notification |
| notifications | vaccine_id | vaccines | $id | Many-to-One | Vaccine for notification |
| notifications | facility_id | facilities | $id | Many-to-One | Responsible facility |
| vaccine_schedule_items | schedule_id | vaccine_schedules | $id | Many-to-One | Parent schedule |
| vaccine_schedule_items | vaccine_id | vaccines | $id | Many-to-One | Vaccine in schedule |
| supplementary_immunizations | vaccine_id | vaccines | $id | Many-to-One | Campaign vaccine |
| supplementary_immunizations | facility_id | facilities | $id | Many-to-One | Campaign facility |
| supplementary_immunizations | created_by | users | $id | Many-to-One | Campaign creator |

## Query Patterns

### Common Query Scenarios

#### 1. Patient Immunization History
```javascript
// Get all immunization records for a patient
// Query: immunization_records where patient_id = {patient_id}
// Includes: vaccine details, facility info, administrator info
```

#### 2. Facility Performance Reports
```javascript
// Get all immunizations at a facility within date range
// Query: immunization_records where facility_id = {facility_id} 
//        AND administered_date BETWEEN {start_date} AND {end_date}
```

#### 3. Vaccine Coverage Analysis
```javascript
// Get all patients who received a specific vaccine
// Query: immunization_records where vaccine_id = {vaccine_id}
// Join with patients for demographic analysis
```

#### 4. Due Immunizations
```javascript
// Get pending notifications for a facility
// Query: notifications where facility_id = {facility_id} 
//        AND status = 'pending' AND due_date <= {current_date}
```

#### 5. Schedule Compliance
```javascript
// Get schedule items for age-appropriate vaccines
// Query: vaccine_schedule_items where schedule_id = {schedule_id}
// Filter by patient age and sequence
```

## Data Integrity Considerations

### Referential Integrity

Since Appwrite doesn't enforce foreign key constraints at the database level, the application must handle referential integrity:

#### Required Validations
1. **Before Creating Records**:
   - Verify referenced documents exist
   - Check user permissions for referenced collections
   - Validate relationship constraints

2. **Before Deleting Records**:
   - Check for dependent records
   - Handle cascade deletions appropriately
   - Update or remove orphaned references

#### Cascade Behaviors

| Parent Collection | Child Collection | Cascade Behavior | Implementation |
|------------------|------------------|------------------|----------------|
| facilities | patients | RESTRICT | Prevent facility deletion if patients exist |
| facilities | immunization_records | RESTRICT | Prevent facility deletion if records exist |
| patients | immunization_records | CASCADE | Delete records when patient is deleted |
| patients | notifications | CASCADE | Delete notifications when patient is deleted |
| vaccines | immunization_records | RESTRICT | Prevent vaccine deletion if records exist |
| vaccines | notifications | CASCADE | Delete notifications when vaccine is deleted |
| vaccine_schedules | vaccine_schedule_items | CASCADE | Delete items when schedule is deleted |

### Orphaned Record Prevention

#### Application-Level Checks
```javascript
// Example validation before creating immunization record
async function validateImmunizationRecord(data) {
  // Check patient exists
  const patient = await getDocument('patients', data.patient_id);
  if (!patient) throw new Error('Patient not found');
  
  // Check vaccine exists and is active
  const vaccine = await getDocument('vaccines', data.vaccine_id);
  if (!vaccine || !vaccine.is_active) throw new Error('Invalid vaccine');
  
  // Check facility exists
  const facility = await getDocument('facilities', data.facility_id);
  if (!facility) throw new Error('Facility not found');
  
  // Check user exists and has permission
  const user = await getDocument('users', data.administered_by_user_id);
  if (!user) throw new Error('User not found');
}
```

## Index Strategy

### Performance Indexes

#### Single-Field Indexes
- **Primary Access**: All `id` fields (automatic)
- **Foreign Keys**: All relationship fields for join performance
- **Status Fields**: For filtering active/inactive records
- **Date Fields**: For temporal queries and sorting

#### Compound Indexes
- **facility_id + status**: For facility-specific filtered queries
- **patient_id + vaccine_id**: For duplicate prevention and history queries
- **schedule_id + sequence_in_schedule**: For ordered schedule queries
- **start_date + end_date**: For date range queries

#### Full-Text Indexes
- **name + description**: For search functionality
- **notes**: For content search in records
- **target_population**: For campaign search

### Query Optimization

#### Recommended Query Patterns

1. **Always include facility_id** in queries for data isolation
2. **Use compound indexes** for multi-field filters
3. **Limit result sets** with pagination
4. **Cache frequently accessed** reference data (vaccines, schedules)

## Security Implications

### Data Isolation

#### Facility-Based Isolation
- Healthcare workers can only access data from their assigned facility
- Queries must include facility_id filter for non-admin users
- Cross-facility data access requires admin privileges

#### Role-Based Access
```json
{
  "admin": {
    "access": "all_facilities",
    "permissions": ["read", "create", "update", "delete"]
  },
  "healthcare_worker": {
    "access": "assigned_facility_only", 
    "permissions": ["read", "create", "update"]
  },
  "patient": {
    "access": "own_records_only",
    "permissions": ["read"]
  }
}
```

### Permission Inheritance

#### Document-Level Security
- Patients can only access their own immunization records
- Healthcare workers can access records for patients at their facility
- Admins have unrestricted access

#### Collection-Level Security
- Reference data (vaccines, schedules) is read-only for healthcare workers
- Facility data is read-only for healthcare workers
- Only admins can modify system configuration

## Migration Notes

### PostgreSQL to Appwrite Mapping

#### ID Field Changes
- **PostgreSQL**: Auto-incrementing integers
- **Appwrite**: UUID strings (36 characters)
- **Migration**: Generate new UUIDs and update all references

#### Relationship Changes
- **PostgreSQL**: Foreign key constraints enforced
- **Appwrite**: Application-level validation required
- **Migration**: Implement validation in application code

#### Data Type Changes
- **Timestamps**: Convert to ISO 8601 format
- **Enums**: Convert to string fields with validation
- **JSON**: Native support in Appwrite documents

### Validation Migration

#### From Database Constraints
```sql
-- PostgreSQL constraint
ALTER TABLE patients ADD CONSTRAINT check_sex 
CHECK (sex IN ('M', 'F'));
```

#### To Application Validation
```json
// Appwrite schema validation
{
  "sex": {
    "enum": ["M", "F"],
    "required": true
  }
}
```

## Maintenance Guidelines

### Regular Maintenance Tasks

1. **Index Performance Review**: Monitor query performance and optimize indexes
2. **Permission Audit**: Regular review of access controls
3. **Data Cleanup**: Remove orphaned records and outdated data
4. **Relationship Validation**: Periodic checks for referential integrity
5. **Schema Evolution**: Plan and execute schema updates

### Monitoring Queries

#### Relationship Health Checks
```javascript
// Check for orphaned records
// Find immunization_records with invalid patient_id
// Find notifications with invalid vaccine_id
// Find patients with invalid facility_id
```

#### Performance Monitoring
```javascript
// Monitor slow queries
// Check index usage
// Analyze query patterns
// Optimize based on usage data
```

This relationships map provides the foundation for understanding data flow and implementing proper application logic for the Appwrite-based Immune Me system.