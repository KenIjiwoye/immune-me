Title: Immune‑Me Data Models, Relationships, and RBAC (for Appwrite Manual Setup)

Scope
- Source of truth: backend/app/models/*.ts only
- Entities covered: Facility, User, Patient, Vaccine, ImmunizationRecord, Notification
- What you can do with this doc: Manually recreate Appwrite collections, attributes, relationships, indexes, and permissions (RBAC) based on the backend models

1) High-Level Entity Relationship Diagram (Textual)

- Facility (1) — n Users
- Facility (1) — n Patients
- Facility (1) — n ImmunizationRecords
- Facility (1) — n Notifications

- User (n) — 1 Facility
- User (1) — n ImmunizationRecords (administeredByUserId)

- Patient (n) — 1 Facility
- Patient (n) — 1 User (healthWorker via healthWorkerId; optional)

- ImmunizationRecord (n) — 1 Patient
- ImmunizationRecord (n) — 1 Vaccine
- ImmunizationRecord (n) — 1 User (administeredBy)
- ImmunizationRecord (n) — 1 Facility

- Notification (n) — 1 Patient
- Notification (n) — 1 Vaccine
- Notification (n) — 1 Facility


2) Collections and Attributes

Notes
- Types shown are from Adonis/Lucid with suggested Appwrite attribute type in parentheses.
- createdAt/updatedAt are system-managed in Adonis; in Appwrite model them as datetime attributes.
- Unless marked nullable, treat attributes as required.
- Relationship attributes are implemented with integer foreign keys; in Appwrite you can either keep numeric FKs or add relationship attributes referencing target collections.

2.1) Facility

Attributes
- id: number (integer)
- name: string (string)
- district: string (string)
- address: string (string)
- contactPhone: string (string)
- createdAt: DateTime (datetime)
- updatedAt: DateTime (datetime)

Relationships
- hasMany Users (via User.facilityId)
- hasMany Patients (via Patient.facilityId)
- hasMany ImmunizationRecords (via ImmunizationRecord.facilityId)
- hasMany Notifications (via Notification.facilityId)

Recommended Indexes
- name (text)
- district (text)
- [optional] unique(name) if needed for your org


2.2) User

Attributes
- id: number (integer)
- username: string (string)
- email: string (email)
- password: string (string; sensitive)
- fullName: string (string)
- role: string (enum: admin | doctor | nurse | supervisor) [inferred from product brief]
- facilityId: number (integer; FK → Facility.id)
- createdAt: DateTime (datetime)
- updatedAt: DateTime (datetime)

Relationships
- belongsTo Facility (facilityId)
- hasMany ImmunizationRecords as administeredImmunizations (via ImmunizationRecord.administeredByUserId)

Recommended Indexes
- email unique
- username unique
- facilityId

Implementation Note
- In Appwrite, prefer Appwrite Authentication for credentials and store staff profile in a Profiles/Users collection (mirror fields except password). If you keep password in a collection, mark it as write-only and never include in read permissions.


2.3) Patient

Attributes
- id: number (integer)
- fullName: string (string)
- sex: &#39;M&#39; | &#39;F&#39; (enum)
- dateOfBirth: DateTime (date)
- motherName: string (string)
- fatherName: string (string)
- district: string (string)
- townVillage: string (string)
- address: string (string)
- contactPhone: string (string)
- healthWorkerId: number | null (integer; FK → User.id)
- healthWorkerName: string | null (string)
- healthWorkerPhone: string | null (string)
- healthWorkerAddress: string | null (string)
- facilityId: number (integer; FK → Facility.id)
- createdAt: DateTime (datetime)
- updatedAt: DateTime (datetime)

Relationships
- belongsTo User (healthWorker via healthWorkerId, optional)
- belongsTo Facility (facilityId)
- Domain relationships (present conceptually; commented out in code to avoid circular deps):
  - hasMany ImmunizationRecords
  - hasMany Notifications

Recommended Indexes
- facilityId
- fullName (text)
- contactPhone
- healthWorkerId


2.4) Vaccine

Attributes
- id: number (integer)
- name: string (string)
- description: string (string)
- vaccineCode: string (string)
- sequenceNumber: number | null (integer)
- vaccineSeries: string | null (string)
- standardScheduleAge: string | null (string) [aka recommendedAge alias]
- isSupplementary: boolean (boolean)
- isActive: boolean (boolean)
- createdAt: DateTime (datetime)
- updatedAt: DateTime (datetime)

Relationships
- hasMany ImmunizationRecords
- hasMany Notifications

Recommended Indexes
- vaccineCode unique
- isActive
- compound: vaccineSeries + sequenceNumber


2.5) ImmunizationRecord

Attributes
- id: number (integer)
- patientId: number (integer; FK → Patient.id)
- vaccineId: number (integer; FK → Vaccine.id)
- administeredDate: DateTime (date)
- administeredByUserId: number (integer; FK → User.id)
- facilityId: number (integer; FK → Facility.id)
- batchNumber: string (string)
- healthOfficer: string | null (string)
- isStandardSchedule: boolean (boolean)
- scheduleStatus: &#39;on_schedule&#39; | &#39;delayed&#39; | &#39;missed&#39; | null (enum)
- returnDate: DateTime (date)
- notes: string (string)
- createdAt: DateTime (datetime)
- updatedAt: DateTime (datetime)

Relationships
- belongsTo Patient (patientId)
- belongsTo Vaccine (vaccineId)
- belongsTo User as administeredBy (administeredByUserId)
- belongsTo Facility (facilityId)

Recommended Indexes
- patientId
- vaccineId
- facilityId
- administeredByUserId
- administeredDate
- scheduleStatus
- compound: patientId + vaccineId


2.6) Notification

Attributes
- id: number (integer)
- patientId: number (integer; FK → Patient.id)
- vaccineId: number (integer; FK → Vaccine.id)
- dueDate: DateTime (date)
- status: &#39;pending&#39; | &#39;viewed&#39; | &#39;completed&#39; | &#39;overdue&#39; (enum)
- facilityId: number (integer; FK → Facility.id)

SMS Tracking
- smsMessageId: string | null (string)
- smsStatus: &#39;not_sent&#39; | &#39;sent&#39; | &#39;delivered&#39; | &#39;failed&#39; | null (enum)
- smsSentAt: DateTime | null (datetime)
- smsDeliveredAt: DateTime | null (datetime)
- smsErrorMessage: string | null (string)
- smsErrorCode: string | null (string)
- smsRetryCount: number (integer)
- smsLastRetryAt: DateTime | null (datetime)

Timestamps
- createdAt: DateTime (datetime)
- updatedAt: DateTime (datetime)

Relationships
- belongsTo Patient (patientId)
- belongsTo Vaccine (vaccineId)
- belongsTo Facility (facilityId)

Recommended Indexes
- facilityId
- dueDate
- status
- patientId
- vaccineId
- smsMessageId


3) Relationship Summary (Cardinality)

- Facility (1) → Users (n) [User.facilityId]
- Facility (1) → Patients (n) [Patient.facilityId]
- Facility (1) → ImmunizationRecords (n) [ImmunizationRecord.facilityId]
- Facility (1) → Notifications (n) [Notification.facilityId]
- User (1) → ImmunizationRecords (n) [ImmunizationRecord.administeredByUserId]
- Patient (1) → ImmunizationRecords (n) [ImmunizationRecord.patientId]
- Vaccine (1) → ImmunizationRecords (n) [ImmunizationRecord.vaccineId]
- Patient (1) → Notifications (n) [Notification.patientId]
- Vaccine (1) → Notifications (n) [Notification.vaccineId]
- Patient (n) → User (1) [Patient.healthWorkerId, optional]


4) Appwrite Attribute Type Mapping (Guide)

- number → integer
- string → string (use email for user email)
- boolean → boolean
- DateTime
  - Use date for date-only fields (e.g., administeredDate, returnDate, dueDate)
  - Use datetime for createdAt/updatedAt and SMS timestamps
- enums → enum type (provide allowed values)
- relationships
  - Either remain as integer foreign keys + enforce via application logic
  - Or add Appwrite relationship attributes referencing target collections using those IDs


5) Appwrite RBAC Model

Assumptions (from product brief)
- Roles: admin, supervisor, doctor, nurse (stored in User.role)
- Facility scoping: Users primarily access data within their Facility

Teams Structure
- Create a Team per Facility: team id pattern facility:{facilityId}
- Team Roles: admin, supervisor, doctor, nurse
- Global Admins (optional): a separate team admins for org-level administrators

Permission Patterns (per document)
- Use team:facility:{facilityId}/* for read across the facility
- Use role-specific permissions for write/update/delete
- You can also use team:facility:{facilityId}/ROLE to scope within a team

Facility (collection)
- read: team:facility:{facilityId}/*
- create/update/delete: team:facility:{facilityId}/admin, team:facility:{facilityId}/supervisor
- Optional: read for all authenticated (role:users) if a public directory is acceptable

User (staff profiles)
- read: team:facility:{facilityId}/*
- create/update/delete: team:facility:{facilityId}/admin, team:facility:{facilityId}/supervisor
- Unique constraints: email, username
- If using Appwrite Auth as the primary identity, keep this as a profile collection without password

Patient
- read: team:facility:{facilityId}/*
- create: team:facility:{facilityId}/doctor, team:facility:{facilityId}/nurse, team:facility:{facilityId}/admin, team:facility:{facilityId}/supervisor
- update/delete: team:facility:{facilityId}/doctor, team:facility:{facilityId}/nurse, team:facility:{facilityId}/admin, team:facility:{facilityId}/supervisor

Vaccine
- read: role:users (or facility team only if you prefer)
- create/update/delete: team:facility:{facilityId}/admin (or global admins)

ImmunizationRecord
- read: team:facility:{facilityId}/*
- create: team:facility:{facilityId}/doctor, team:facility:{facilityId}/nurse, team:facility:{facilityId}/admin
- update: team:facility:{facilityId}/doctor, team:facility:{facilityId}/nurse, team:facility:{facilityId}/admin
- delete: team:facility:{facilityId}/admin

Notification
- read: team:facility:{facilityId}/*
- update status (viewed/completed/overdue): team:facility:{facilityId}/doctor, team:facility:{facilityId}/nurse, team:facility:{facilityId}/admin, team:facility:{facilityId}/supervisor
- SMS tracking field updates: restrict to admins and automation context
  - Option 1: Create a team:system and include it in write permissions for Notification docs
  - Option 2: Run Appwrite functions with elevated API keys

Role Capability Summary
- Admin
  - Full CRUD on Facility, User, Patient, Vaccine, ImmunizationRecord, Notification (typically scoped to their facility; org admins across facilities)
- Supervisor
  - Read all facility data; manage Patients, ImmunizationRecords, Notifications; optionally limited User management; Vaccines read-only
- Doctor/Nurse
  - Read all facility data; CRUD Patients (within facility), create/update ImmunizationRecords; update Notification status; Vaccines read-only; no User management


6) Recommended Indexes (Cross-Collection)

Users
- email unique
- username unique
- facilityId

Patients
- facilityId
- contactPhone
- fullName (text)
- healthWorkerId

Vaccines
- vaccineCode unique
- isActive
- vaccineSeries + sequenceNumber (compound)

ImmunizationRecords
- facilityId
- patientId
- vaccineId
- administeredByUserId
- administeredDate
- scheduleStatus
- compound: patientId + vaccineId

Notifications
- facilityId
- dueDate
- status
- patientId
- vaccineId
- smsMessageId


7) Example Document Shapes (Minimal)

User
{
  "username": "jdoe",
  "email": "jdoe@clinic.org",
  "fullName": "John Doe",
  "role": "nurse",
  "facilityId": 1
}

Patient
{
  "fullName": "Baby Smith",
  "sex": "F",
  "dateOfBirth": "2024-08-01",
  "motherName": "Jane Smith",
  "fatherName": "—",
  "district": "Montserrado",
  "townVillage": "New Georgia",
  "address": "123 Lane",
  "contactPhone": "+2317xxxxxxx",
  "healthWorkerId": 12,
  "healthWorkerName": "Nurse Mary",
  "healthWorkerPhone": "+2317xxxxxxx",
  "healthWorkerAddress": "Clinic Road",
  "facilityId": 1
}

Vaccine
{
  "name": "Penta",
  "description": "DTP-HepB-Hib",
  "vaccineCode": "PENTA",
  "sequenceNumber": 1,
  "vaccineSeries": "PENTA",
  "standardScheduleAge": "6 weeks",
  "isSupplementary": false,
  "isActive": true
}

ImmunizationRecord
{
  "patientId": 101,
  "vaccineId": 5,
  "administeredDate": "2025-01-10",
  "administeredByUserId": 12,
  "facilityId": 1,
  "batchNumber": "BN-2025-001",
  "healthOfficer": "Nurse Mary",
  "isStandardSchedule": true,
  "scheduleStatus": "on_schedule",
  "returnDate": "2025-02-10",
  "notes": "No adverse effects reported"
}

Notification
{
  "patientId": 101,
  "vaccineId": 5,
  "dueDate": "2025-02-10",
  "status": "pending",
  "facilityId": 1,
  "smsMessageId": null,
  "smsStatus": "not_sent",
  "smsSentAt": null,
  "smsDeliveredAt": null,
  "smsErrorMessage": null,
  "smsErrorCode": null,
  "smsRetryCount": 0,
  "smsLastRetryAt": null
}


8) Setup Checklist for Appwrite (Step-by-step)

- Create Collections:
  - facilities, users (or profiles), patients, vaccines, immunization_records, notifications
- Create Attributes:
  - Use the attributes listed for each collection above
  - Configure enums:
    - Patient.sex: ["M","F"]
    - ImmunizationRecord.scheduleStatus: ["on_schedule","delayed","missed"]
    - Notification.status: ["pending","viewed","completed","overdue"]
    - Notification.smsStatus: ["not_sent","sent","delivered","failed"]
    - User.role: ["admin","doctor","nurse","supervisor"] (from product brief)
- Create Relationships (optional but recommended):
  - users.facilityId → facilities.id
  - patients.facilityId → facilities.id
  - patients.healthWorkerId → users.id
  - immunization_records.(patientId, vaccineId, administeredByUserId, facilityId) → respective targets
  - notifications.(patientId, vaccineId, facilityId) → respective targets
- Create Indexes:
  - As recommended in each section
- Configure Teams & Permissions:
  - One Team per Facility: facility:{facilityId}
  - Team roles: admin, supervisor, doctor, nurse
  - Apply permissions templates per collection as specified in the RBAC section
- Automation Access (Notifications):
  - Ensure an automation identity (system team or function API key) can update sms* fields


9) Notes and Assumptions

- Roles are inferred from the product brief; the code stores role as a string on User.
- The Adonis access tokens provider is specific to the Node backend; for Appwrite, prefer Appwrite Auth and API Keys/Functions for automation.
- Patient has commented-out relations to ImmunizationRecord and Notification in code to avoid circular deps, but domain-wise those are valid hasMany relations and are implemented via FKs in the other collections.
