# TypeScript Type Definitions

This directory contains TypeScript type definitions for all entities, interfaces, and data structures used in the Appwrite backend implementation.

## Overview

Type definitions provide type safety, better developer experience, and clear contracts for data structures throughout the Appwrite backend. These types correspond to Appwrite collections, function parameters, API responses, and internal data structures.

## Type Categories

### Core Entity Types (`entities/`)
- **User Types**: Healthcare workers, administrators, and system users
- **Patient Types**: Patient records and related data structures
- **Facility Types**: Healthcare facilities and clinic information
- **Vaccine Types**: Vaccine definitions and metadata
- **Immunization Types**: Immunization records and history

### System Types (`system/`)
- **Notification Types**: Notification entities and delivery channels
- **Report Types**: Report definitions and generated data
- **Audit Types**: System activity and change tracking
- **Settings Types**: Application configuration structures

### API Types (`api/`)
- **Request Types**: API request payloads and parameters
- **Response Types**: API response structures and error formats
- **Query Types**: Database query parameters and filters
- **Pagination Types**: Pagination request and response structures

### Utility Types (`utils/`)
- **Common Types**: Shared utility types and generic structures
- **Validation Types**: Data validation and error types
- **Permission Types**: Role and permission definitions
- **Integration Types**: External API and webhook types

## Core Entity Types

### User Types
```typescript
// entities/user.ts
export interface User {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  facilityId?: string;
  isActive: boolean;
  lastLogin?: string;
  preferences: UserPreferences;
  labels: string[];
}

export enum UserRole {
  ADMIN = 'admin',
  HEALTHCARE_WORKER = 'healthcare_worker',
  FACILITY_MANAGER = 'facility_manager',
  VIEWER = 'viewer'
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: NotificationPreferences;
  timezone: string;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  dueImmunizations: boolean;
  systemAlerts: boolean;
}
```

### Patient Types
```typescript
// entities/patient.ts
export interface Patient {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  patientId: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: Gender;
  contactInfo: ContactInfo;
  facilityId: string;
  guardianInfo?: GuardianInfo;
  medicalInfo: MedicalInfo;
  isActive: boolean;
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other'
}

export interface ContactInfo {
  phone?: string;
  email?: string;
  address: Address;
  emergencyContact?: EmergencyContact;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface GuardianInfo {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

export interface MedicalInfo {
  allergies: string[];
  medicalConditions: string[];
  medications: string[];
  notes?: string;
}
```

### Immunization Types
```typescript
// entities/immunization.ts
export interface ImmunizationRecord {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  patientId: string;
  vaccineId: string;
  administeredDate: string;
  doseNumber: number;
  administeredBy: string;
  facilityId: string;
  batchNumber?: string;
  expirationDate?: string;
  administrationSite: AdministrationSite;
  route: AdministrationRoute;
  notes?: string;
  reactions?: VaccineReaction[];
  isValid: boolean;
}

export enum AdministrationSite {
  LEFT_ARM = 'left_arm',
  RIGHT_ARM = 'right_arm',
  LEFT_THIGH = 'left_thigh',
  RIGHT_THIGH = 'right_thigh',
  ORAL = 'oral',
  NASAL = 'nasal'
}

export enum AdministrationRoute {
  INTRAMUSCULAR = 'intramuscular',
  SUBCUTANEOUS = 'subcutaneous',
  ORAL = 'oral',
  INTRANASAL = 'intranasal',
  INTRADERMAL = 'intradermal'
}

export interface VaccineReaction {
  type: ReactionType;
  severity: ReactionSeverity;
  description: string;
  onsetTime?: string;
  duration?: string;
}

export enum ReactionType {
  LOCAL = 'local',
  SYSTEMIC = 'systemic',
  ALLERGIC = 'allergic'
}

export enum ReactionSeverity {
  MILD = 'mild',
  MODERATE = 'moderate',
  SEVERE = 'severe'
}
```

### Vaccine Types
```typescript
// entities/vaccine.ts
export interface Vaccine {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  name: string;
  code: string;
  manufacturer: string;
  description: string;
  type: VaccineType;
  ageGroups: AgeGroup[];
  dosageInfo: DosageInfo;
  contraindications: string[];
  sideEffects: string[];
  storageRequirements: StorageRequirements;
  isActive: boolean;
}

export enum VaccineType {
  ROUTINE = 'routine',
  SUPPLEMENTARY = 'supplementary',
  CAMPAIGN = 'campaign',
  OUTBREAK_RESPONSE = 'outbreak_response'
}

export interface AgeGroup {
  minAge: number;
  maxAge?: number;
  ageUnit: AgeUnit;
}

export enum AgeUnit {
  DAYS = 'days',
  WEEKS = 'weeks',
  MONTHS = 'months',
  YEARS = 'years'
}

export interface DosageInfo {
  volume: number;
  unit: string;
  numberOfDoses: number;
  intervalBetweenDoses?: number;
  intervalUnit?: AgeUnit;
}

export interface StorageRequirements {
  minTemperature: number;
  maxTemperature: number;
  temperatureUnit: 'celsius' | 'fahrenheit';
  lightSensitive: boolean;
  shelfLife: number;
  shelfLifeUnit: AgeUnit;
}
```

## API Types

### Request Types
```typescript
// api/requests.ts
export interface CreatePatientRequest {
  patientId: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: Gender;
  contactInfo: ContactInfo;
  facilityId: string;
  guardianInfo?: GuardianInfo;
  medicalInfo?: Partial<MedicalInfo>;
}

export interface UpdatePatientRequest extends Partial<CreatePatientRequest> {
  isActive?: boolean;
}

export interface CreateImmunizationRequest {
  patientId: string;
  vaccineId: string;
  administeredDate: string;
  doseNumber: number;
  administeredBy: string;
  batchNumber?: string;
  expirationDate?: string;
  administrationSite: AdministrationSite;
  route: AdministrationRoute;
  notes?: string;
}

export interface QueryFilters {
  facilityId?: string;
  startDate?: string;
  endDate?: string;
  ageMin?: number;
  ageMax?: number;
  vaccineId?: string;
  status?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}
```

### Response Types
```typescript
// api/responses.ts
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface ResponseMeta {
  pagination?: PaginationMeta;
  timestamp: string;
  requestId: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ListResponse<T> {
  documents: T[];
  total: number;
}

// Specific response types
export interface PatientResponse extends ApiResponse<Patient> {}
export interface PatientListResponse extends ApiResponse<ListResponse<Patient>> {}
export interface ImmunizationResponse extends ApiResponse<ImmunizationRecord> {}
export interface ImmunizationListResponse extends ApiResponse<ListResponse<ImmunizationRecord>> {}
```

## System Types

### Notification Types
```typescript
// system/notifications.ts
export interface Notification {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  type: NotificationType;
  title: string;
  message: string;
  recipientId: string;
  recipientType: RecipientType;
  channels: NotificationChannel[];
  status: NotificationStatus;
  scheduledFor?: string;
  sentAt?: string;
  metadata: NotificationMetadata;
}

export enum NotificationType {
  DUE_IMMUNIZATION = 'due_immunization',
  MISSED_APPOINTMENT = 'missed_appointment',
  SYSTEM_ALERT = 'system_alert',
  REPORT_READY = 'report_ready',
  ACCOUNT_UPDATE = 'account_update'
}

export enum RecipientType {
  USER = 'user',
  PATIENT = 'patient',
  FACILITY = 'facility'
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app'
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface NotificationMetadata {
  patientId?: string;
  facilityId?: string;
  vaccineId?: string;
  reportId?: string;
  priority: NotificationPriority;
  retryCount?: number;
  errorMessage?: string;
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}
```

### Report Types
```typescript
// system/reports.ts
export interface Report {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  type: ReportType;
  title: string;
  description: string;
  parameters: ReportParameters;
  status: ReportStatus;
  generatedBy: string;
  facilityId?: string;
  data?: ReportData;
  fileUrl?: string;
  scheduledFor?: string;
  completedAt?: string;
}

export enum ReportType {
  IMMUNIZATION_COVERAGE = 'immunization_coverage',
  DUE_IMMUNIZATIONS = 'due_immunizations',
  FACILITY_PERFORMANCE = 'facility_performance',
  AGE_DISTRIBUTION = 'age_distribution',
  VACCINE_USAGE = 'vaccine_usage',
  ADVERSE_EVENTS = 'adverse_events'
}

export enum ReportStatus {
  PENDING = 'pending',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface ReportParameters {
  startDate: string;
  endDate: string;
  facilityIds?: string[];
  vaccineIds?: string[];
  ageGroups?: AgeGroup[];
  format: ReportFormat;
}

export enum ReportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
  JSON = 'json'
}

export interface ReportData {
  summary: ReportSummary;
  details: any[];
  charts?: ChartData[];
}

export interface ReportSummary {
  totalPatients: number;
  totalImmunizations: number;
  coverageRate: number;
  dueImmunizations: number;
}

export interface ChartData {
  type: ChartType;
  title: string;
  data: ChartDataPoint[];
}

export enum ChartType {
  BAR = 'bar',
  LINE = 'line',
  PIE = 'pie',
  AREA = 'area'
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}
```

## Utility Types

### Common Types
```typescript
// utils/common.ts
export type ID = string;
export type Timestamp = string;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export interface BaseDocument {
  $id: ID;
  $createdAt: Timestamp;
  $updatedAt: Timestamp;
  $permissions: string[];
}

export interface TimestampedEntity {
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SoftDeletable {
  isDeleted: boolean;
  deletedAt?: Timestamp;
}

export interface Auditable {
  createdBy: ID;
  updatedBy: ID;
}
```

### Validation Types
```typescript
// utils/validation.ts
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'phone';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean;
}
```

## File Organization

### Directory Structure
```
types/
├── entities/
│   ├── user.ts
│   ├── patient.ts
│   ├── facility.ts
│   ├── vaccine.ts
│   └── immunization.ts
├── system/
│   ├── notifications.ts
│   ├── reports.ts
│   ├── audit.ts
│   └── settings.ts
├── api/
│   ├── requests.ts
│   ├── responses.ts
│   ├── queries.ts
│   └── pagination.ts
├── utils/
│   ├── common.ts
│   ├── validation.ts
│   ├── permissions.ts
│   └── integration.ts
└── index.ts
```

### Export Pattern
```typescript
// types/index.ts - Central export file
export * from './entities';
export * from './system';
export * from './api';
export * from './utils';
```

## Best Practices

### Type Definition
1. **Explicit Types**: Use explicit types instead of `any` whenever possible
2. **Interface vs Type**: Use interfaces for object shapes, types for unions and computed types
3. **Generic Types**: Use generics for reusable type definitions
4. **Enum Usage**: Use enums for fixed sets of values

### Documentation
1. **JSDoc Comments**: Document complex types with JSDoc comments
2. **Examples**: Provide usage examples for complex types
3. **Relationships**: Document relationships between types
4. **Validation**: Document validation rules and constraints

### Maintenance
1. **Versioning**: Version types when making breaking changes
2. **Backward Compatibility**: Maintain backward compatibility when possible
3. **Migration**: Provide migration guides for type changes
4. **Testing**: Test type definitions with actual data

### Usage
1. **Import Organization**: Organize imports by category
2. **Type Guards**: Use type guards for runtime type checking
3. **Utility Types**: Leverage TypeScript utility types
4. **Strict Mode**: Use TypeScript strict mode for better type safety