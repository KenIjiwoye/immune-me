# Profile Relationship Diagrams

## Overview

This document provides comprehensive relationship diagrams showing how the new Profile collections integrate with existing Appwrite collections while maintaining backward compatibility.

## System Architecture with Profiles

```mermaid
graph TB
    subgraph "Authentication Layer"
        AU[Appwrite Users]
        AT[Appwrite Teams]
        AL[User Labels]
    end
    
    subgraph "Profile Layer"
        PP[PatientProfile]
        EP[EmployeeProfile] 
        AP[AdminProfile]
    end
    
    subgraph "Core Collections"
        PA[Patients]
        IR[Immunization Records]
        FA[Facilities]
        VA[Vaccines]
        NO[Notifications]
    end
    
    subgraph "Extended Collections"
        VS[Vaccine Schedules]
        VSI[Vaccine Schedule Items]
        SI[Supplementary Immunizations]
    end
    
    %% Profile Relationships
    AU -->|1:1| PP
    AU -->|1:1| EP
    AU -->|1:1| AP
    
    %% Profile to Core Collection Relationships
    PP -->|1:1| PA
    EP -->|1:N| IR
    EP -->|N:N| FA
    
    %% Existing Relationships (Maintained)
    PA -->|1:N| IR
    FA -->|1:N| PA
    FA -->|1:N| IR
    VA -->|1:N| IR
    
    %% Team and Label Relationships
    AU -->|N:N| AT
    AU -->|1:N| AL
    
    %% Enhanced Relationships
    PP -->|1:N| NO
    EP -->|1:N| NO
    AP -->|1:N| NO
    
    style PP fill:#e1f5fe
    style EP fill:#f3e5f5
    style AP fill:#fff3e0
```

## Detailed Profile Integration Patterns

### 1. PatientProfile Integration

```mermaid
graph LR
    subgraph "Patient Authentication Flow"
        PU[Patient User Account]
        PP[PatientProfile]
        PA[Patients Collection]
        IR[Immunization Records]
        NO[Notifications]
    end
    
    PU -->|user_id| PP
    PP -->|patient_id| PA
    PA -->|patient_id| IR
    PP -->|user_id| NO
    
    PP -.->|guardian_user_id| PU
    
    %% Field Mappings
    PU -->|email, phone| PP
    PP -->|verification_status| PA
    PP -->|access_permissions| IR
    PP -->|notification_preferences| NO
    
    style PP fill:#e1f5fe
    style PU fill:#e8f5e8
```

**Key Integration Points:**
- **User Account**: Standard Appwrite authentication with `role:patient` label
- **Profile Link**: `user_id` references Appwrite Users collection
- **Patient Link**: `patient_id` references existing patients collection
- **Guardian Support**: `guardian_user_id` for minor patients
- **Access Control**: `access_permissions` array controls data visibility

### 2. EmployeeProfile Integration

```mermaid
graph TB
    subgraph "Employee Authentication & Management"
        EU[Employee User Account]
        EP[EmployeeProfile]
        FT[Facility Teams]
        FA[Facilities]
        IR[Immunization Records]
        PA[Patients]
    end
    
    EU -->|user_id| EP
    EP -->|primary_facility_id| FA
    EP -->|assigned_facilities[]| FA
    EP -->|supervisor_user_id| EU
    
    EU -->|team membership| FT
    FT -->|facility access| FA
    
    %% Work Relationships
    EP -->|administered_by_user_id| IR
    PA -->|health_worker_id| EU
    
    %% Enhanced Tracking
    EP -->|employee_id| IR
    EP -->|license_number| IR
    EP -->|professional_title| IR
    
    style EP fill:#f3e5f5
    style EU fill:#e8f5e8
    style FT fill:#fff9c4
```

**Key Integration Points:**
- **Multi-Facility Access**: `assigned_facilities` array for cross-facility workers
- **Hierarchy**: `supervisor_user_id` creates management chains
- **Professional Tracking**: License numbers and expiry dates
- **Enhanced Audit**: Professional credentials in immunization records
- **Backward Compatibility**: Existing `health_worker_id` references maintained

### 3. AdminProfile Integration

```mermaid
graph TB
    subgraph "Admin Management System"
        AU[Admin User Account]
        AP[AdminProfile]
        GAT[Global Admin Team]
        FA[Facilities]
        EU[All Employee Users]
        SL[System Logs]
    end
    
    AU -->|user_id| AP
    AU -->|team membership| GAT
    
    AP -->|facility_access_scope| FA
    AP -->|assigned_facilities[]| FA
    AP -->|user_management_scope| EU
    AP -->|backup_admin_user_id| AU
    
    %% System Access
    AP -->|audit_log_access| SL
    AP -->|system_config_access| FA
    
    %% Security Features
    AP -->|mfa_enabled| AU
    AP -->|security_clearance| SL
    
    style AP fill:#fff3e0
    style AU fill:#e8f5e8
    style GAT fill:#ffebee
```

**Key Integration Points:**
- **Scope Control**: `facility_access_scope` (all/assigned/single)
- **Security Levels**: `security_clearance` and MFA requirements
- **Backup Systems**: `backup_admin_user_id` for continuity
- **Audit Access**: Enhanced logging and monitoring capabilities

## Backward Compatibility Relationships

### Current System (Maintained)

```mermaid
graph LR
    subgraph "Legacy User References"
        AU[Appwrite Users]
        IR[Immunization Records]
        PA[Patients]
        NO[Notifications]
    end
    
    AU -->|administered_by_user_id| IR
    AU -->|health_worker_id| PA
    AU -->|recipient_id| NO
    
    %% These relationships remain unchanged
    IR -.->|"MAINTAINED"| AU
    PA -.->|"MAINTAINED"| AU
    NO -.->|"MAINTAINED"| AU
    
    style AU fill:#e8f5e8
    style IR fill:#f5f5f5
    style PA fill:#f5f5f5
    style NO fill:#f5f5f5
```

### Enhanced System (New Capabilities)

```mermaid
graph LR
    subgraph "Enhanced User References"
        AU[Appwrite Users]
        EP[EmployeeProfile]
        PP[PatientProfile]
        IR[Immunization Records]
        PA[Patients]
        NO[Notifications]
    end
    
    AU -->|user_id| EP
    AU -->|user_id| PP
    
    %% Enhanced relationships
    EP -->|employee_details| IR
    PP -->|patient_verification| PA
    EP -->|professional_info| NO
    PP -->|notification_prefs| NO
    
    %% Dual access pattern
    IR -.->|"Legacy: user_id"| AU
    IR -.->|"Enhanced: profile lookup"| EP
    
    style EP fill:#f3e5f5
    style PP fill:#e1f5fe
    style AU fill:#e8f5e8
```

## Data Flow Patterns

### 1. User Creation Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant A as Auth Service
    participant P as Profile Service
    participant T as Team Service
    participant D as Database
    
    C->>A: Create User Account
    A->>D: Create Appwrite User
    A->>A: Add Role Labels
    A->>T: Add to Facility Team
    
    alt Employee User
        C->>P: Create Employee Profile
        P->>D: Create EmployeeProfile
        P->>P: Validate License
        P->>T: Update Team Role
    else Patient User
        C->>P: Create Patient Profile
        P->>D: Create PatientProfile
        P->>P: Link to Patient Record
        P->>P: Set Verification Status
    else Admin User
        C->>P: Create Admin Profile
        P->>D: Create AdminProfile
        P->>P: Set Security Clearance
        P->>T: Add to Global Admin Team
    end
    
    P->>C: Return Complete Profile
```

### 2. Authentication Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant A as Auth Service
    participant P as Profile Service
    participant D as Database
    
    C->>A: Login Request
    A->>A: Validate Credentials
    A->>D: Get User Account
    A->>P: Determine Profile Type
    
    P->>D: Query PatientProfile
    P->>D: Query EmployeeProfile  
    P->>D: Query AdminProfile
    
    P->>P: Load Appropriate Profile
    P->>P: Calculate Permissions
    P->>C: Return Auth Context
    
    Note over C,D: Client receives user + profile + permissions
```

### 3. Data Access Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant A as API Service
    participant P as Profile Service
    participant D as Database
    
    C->>A: Request Data
    A->>A: Validate Session
    A->>P: Get User Profile
    
    alt Employee Profile
        P->>D: Get EmployeeProfile
        P->>P: Check Facility Access
        P->>P: Validate License Status
        A->>D: Query with Facility Filter
    else Patient Profile
        P->>D: Get PatientProfile
        P->>P: Check Access Permissions
        A->>D: Query Own Records Only
    else Admin Profile
        P->>D: Get AdminProfile
        P->>P: Check Access Scope
        A->>D: Query Based on Scope
    end
    
    A->>C: Return Filtered Data
```

## Migration Relationship Patterns

### Phase 1: Profile Creation (Parallel System)

```mermaid
graph TB
    subgraph "Current System (Unchanged)"
        AU1[Appwrite Users]
        IR1[Immunization Records]
        PA1[Patients]
    end
    
    subgraph "New Profile System (Parallel)"
        AU2[Appwrite Users]
        EP[EmployeeProfile]
        PP[PatientProfile]
        AP[AdminProfile]
    end
    
    AU1 -.->|"Same Users"| AU2
    AU2 -->|user_id| EP
    AU2 -->|user_id| PP
    AU2 -->|user_id| AP
    
    %% Both systems operational
    IR1 -->|administered_by_user_id| AU1
    PA1 -->|health_worker_id| AU1
    
    style AU1 fill:#e8f5e8
    style AU2 fill:#e8f5e8
    style EP fill:#f3e5f5
    style PP fill:#e1f5fe
    style AP fill:#fff3e0
```

### Phase 2: Enhanced Features (Progressive Enhancement)

```mermaid
graph TB
    subgraph "Legacy Operations"
        AU[Appwrite Users]
        IR1[Legacy Immunization Records]
        PA1[Legacy Patient Operations]
    end
    
    subgraph "Enhanced Operations"
        EP[EmployeeProfile]
        PP[PatientProfile]
        IR2[Enhanced Immunization Records]
        PA2[Enhanced Patient Operations]
    end
    
    AU -->|user_id| EP
    AU -->|user_id| PP
    
    %% Legacy path (maintained)
    IR1 -->|administered_by_user_id| AU
    PA1 -->|health_worker_id| AU
    
    %% Enhanced path (new features)
    IR2 -->|profile lookup| EP
    PA2 -->|profile lookup| PP
    
    EP -->|professional_details| IR2
    PP -->|verification_status| PA2
    
    style IR1 fill:#f5f5f5
    style PA1 fill:#f5f5f5
    style IR2 fill:#e3f2fd
    style PA2 fill:#e3f2fd
```

### Phase 3: Full Integration (Future State)

```mermaid
graph TB
    subgraph "Unified Profile System"
        AU[Appwrite Users]
        EP[EmployeeProfile]
        PP[PatientProfile]
        AP[AdminProfile]
        IR[Immunization Records]
        PA[Patients]
        NO[Notifications]
    end
    
    AU -->|user_id| EP
    AU -->|user_id| PP
    AU -->|user_id| AP
    
    %% All operations use profiles
    EP -->|professional_context| IR
    PP -->|patient_context| PA
    AP -->|admin_context| NO
    
    %% Legacy references maintained for compatibility
    IR -.->|"fallback"| AU
    PA -.->|"fallback"| AU
    
    style AU fill:#e8f5e8
    style EP fill:#f3e5f5
    style PP fill:#e1f5fe
    style AP fill:#fff3e0
```

## Security Relationship Patterns

### Role-Based Access with Profiles

```mermaid
graph TB
    subgraph "Security Layer"
        AU[Appwrite Users]
        AL[User Labels]
        AT[Appwrite Teams]
        EP[EmployeeProfile]
        PP[PatientProfile]
        AP[AdminProfile]
    end
    
    subgraph "Data Layer"
        FA[Facilities]
        PA[Patients]
        IR[Immunization Records]
        NO[Notifications]
    end
    
    AU -->|labels| AL
    AU -->|membership| AT
    AU -->|profile| EP
    AU -->|profile| PP
    AU -->|profile| AP
    
    %% Security enforcement
    AL -->|role:doctor| EP
    AL -->|role:patient| PP
    AL -->|role:administrator| AP
    
    AT -->|facility-team| FA
    EP -->|facility_access| FA
    PP -->|facility_id| FA
    AP -->|facility_scope| FA
    
    %% Data access
    EP -->|professional_access| IR
    PP -->|self_access| PA
    AP -->|admin_access| NO
    
    style AL fill:#ffebee
    style AT fill:#fff9c4
    style EP fill:#f3e5f5
    style PP fill:#e1f5fe
    style AP fill:#fff3e0
```

## Performance Optimization Patterns

### Profile Caching Strategy

```mermaid
graph LR
    subgraph "Request Flow"
        C[Client Request]
        A[API Gateway]
        PC[Profile Cache]
        PS[Profile Service]
        D[Database]
    end
    
    C -->|request| A
    A -->|check cache| PC
    
    PC -->|cache hit| A
    PC -->|cache miss| PS
    PS -->|query| D
    PS -->|cache result| PC
    PS -->|return| A
    
    A -->|response| C
    
    style PC fill:#e8f5e8
    style PS fill:#f3e5f5
```

### Relationship Query Optimization

```mermaid
graph TB
    subgraph "Optimized Queries"
        U[User Query]
        PI[Profile Index]
        FI[Facility Index]
        CI[Compound Index]
    end
    
    subgraph "Query Patterns"
        Q1[Get User + Profile]
        Q2[Get Facility Users]
        Q3[Get User Permissions]
    end
    
    U -->|user_id| PI
    PI -->|facility_id| FI
    FI -->|compound| CI
    
    Q1 -->|single query| PI
    Q2 -->|facility filter| FI
    Q3 -->|permission calc| CI
    
    style PI fill:#e3f2fd
    style FI fill:#f3e5f5
    style CI fill:#fff3e0
```

This relationship architecture ensures:

1. **Seamless Integration**: Profiles extend existing functionality without breaking changes
2. **Backward Compatibility**: All existing user references continue to work
3. **Progressive Enhancement**: New features can leverage rich profile data
4. **Security**: Appropriate access controls for each user type
5. **Performance**: Optimized queries and caching strategies
6. **Scalability**: Extensible design for future requirements

The next phase involves creating the detailed migration strategy.