# Utility Functions and Helpers

This directory contains shared utility functions, helper modules, and common code used across the Appwrite backend implementation.

## Overview

Utilities provide reusable functionality that supports the core business logic, data processing, and system operations. These modules help maintain code consistency, reduce duplication, and provide common patterns for the Appwrite backend.

## Utility Categories

### Database Utilities (`database/`)
- **Query Builders**: Helper functions for constructing Appwrite queries
- **Data Transformers**: Functions to convert between data formats
- **Validation Helpers**: Common validation functions for database operations
- **Pagination Utilities**: Functions for handling paginated results

### Authentication Utilities (`auth/`)
- **Permission Helpers**: Functions for checking user permissions and roles
- **Token Utilities**: JWT token generation and validation helpers
- **Session Management**: Functions for managing user sessions
- **Role Validators**: Functions to validate user roles and access levels

### Notification Utilities (`notifications/`)
- **Message Formatters**: Functions to format notification messages
- **Channel Handlers**: Utilities for different notification channels (email, SMS, push)
- **Template Processors**: Functions to process notification templates
- **Delivery Trackers**: Utilities for tracking notification delivery status

### Data Processing (`data/`)
- **Date Utilities**: Functions for date manipulation and formatting
- **Validation Functions**: Common data validation and sanitization
- **Format Converters**: Functions to convert between data formats
- **Calculation Helpers**: Utilities for immunization calculations and schedules

### Integration Utilities (`integrations/`)
- **API Clients**: Wrapper functions for external API calls
- **Webhook Handlers**: Utilities for processing incoming webhooks
- **Data Sync Helpers**: Functions for synchronizing with external systems
- **Error Handlers**: Common error handling patterns for integrations

### Reporting Utilities (`reports/`)
- **Data Aggregators**: Functions for aggregating and summarizing data
- **Chart Generators**: Utilities for generating chart data
- **Export Helpers**: Functions for exporting data to various formats
- **Statistical Calculators**: Utilities for calculating coverage and performance metrics

## Common Utility Functions

### Database Query Helpers
```typescript
// Query builder utilities
export const buildPatientQuery = (filters: PatientFilters) => {
  const queries = [];
  if (filters.facilityId) {
    queries.push(Query.equal('facilityId', filters.facilityId));
  }
  if (filters.ageRange) {
    queries.push(Query.between('birthDate', filters.ageRange.start, filters.ageRange.end));
  }
  return queries;
};

// Pagination helper
export const paginateResults = async (
  database: Databases,
  collectionId: string,
  queries: string[],
  page: number = 1,
  limit: number = 25
) => {
  const offset = (page - 1) * limit;
  const paginatedQueries = [
    ...queries,
    Query.limit(limit),
    Query.offset(offset)
  ];
  
  return await database.listDocuments(DATABASE_ID, collectionId, paginatedQueries);
};
```

### Date and Time Utilities
```typescript
// Date formatting and manipulation
export const formatDate = (date: Date, format: string = 'YYYY-MM-DD'): string => {
  // Implementation for date formatting
};

export const calculateAge = (birthDate: Date): number => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};
```

### Validation Utilities
```typescript
// Common validation functions
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
};

export const validatePatientId = (patientId: string): boolean => {
  // Implement patient ID format validation
  return /^PAT-\d{6}$/.test(patientId);
};

export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};
```

### Permission Utilities
```typescript
// Role and permission checking
export const hasRole = (user: any, role: string): boolean => {
  return user.labels?.includes(role) || false;
};

export const canAccessFacility = (user: any, facilityId: string): boolean => {
  return hasRole(user, 'admin') || user.facilityId === facilityId;
};

export const canModifyPatient = (user: any, patient: any): boolean => {
  return hasRole(user, 'admin') || 
         hasRole(user, 'healthcare_worker') && 
         canAccessFacility(user, patient.facilityId);
};
```

### Error Handling Utilities
```typescript
// Standardized error handling
export class AppwriteError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppwriteError';
  }
}

export const handleDatabaseError = (error: any): AppwriteError => {
  if (error.code === 404) {
    return new AppwriteError('Document not found', 'DOCUMENT_NOT_FOUND', 404);
  }
  if (error.code === 401) {
    return new AppwriteError('Unauthorized access', 'UNAUTHORIZED', 401);
  }
  return new AppwriteError('Database operation failed', 'DATABASE_ERROR', 500);
};

export const logError = (error: Error, context: any = {}) => {
  console.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
};
```

### Notification Utilities
```typescript
// Notification formatting and sending
export const formatNotificationMessage = (
  template: string,
  variables: Record<string, any>
): string => {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] || match;
  });
};

export const sendEmail = async (
  to: string,
  subject: string,
  body: string,
  isHtml: boolean = false
) => {
  // Implementation for sending emails via Appwrite
};

export const sendSMS = async (to: string, message: string) => {
  // Implementation for sending SMS
};
```

### Data Transformation Utilities
```typescript
// Data format conversion
export const transformPatientData = (appwritePatient: any) => {
  return {
    id: appwritePatient.$id,
    patientId: appwritePatient.patientId,
    firstName: appwritePatient.firstName,
    lastName: appwritePatient.lastName,
    birthDate: appwritePatient.birthDate,
    age: calculateAge(new Date(appwritePatient.birthDate)),
    facilityId: appwritePatient.facilityId,
    createdAt: appwritePatient.$createdAt,
    updatedAt: appwritePatient.$updatedAt
  };
};

export const transformImmunizationRecord = (record: any) => {
  return {
    id: record.$id,
    patientId: record.patientId,
    vaccineId: record.vaccineId,
    administeredDate: record.administeredDate,
    doseNumber: record.doseNumber,
    administeredBy: record.administeredBy,
    facilityId: record.facilityId,
    notes: record.notes,
    createdAt: record.$createdAt
  };
};
```

## File Organization

### Directory Structure
```
utils/
├── auth/
│   ├── permissions.ts
│   ├── tokens.ts
│   └── sessions.ts
├── database/
│   ├── queries.ts
│   ├── pagination.ts
│   └── transformers.ts
├── notifications/
│   ├── formatters.ts
│   ├── channels.ts
│   └── templates.ts
├── data/
│   ├── validators.ts
│   ├── dates.ts
│   └── calculations.ts
├── integrations/
│   ├── api-clients.ts
│   ├── webhooks.ts
│   └── sync.ts
├── reports/
│   ├── aggregators.ts
│   ├── exporters.ts
│   └── calculators.ts
├── errors/
│   ├── handlers.ts
│   └── types.ts
└── index.ts
```

### Export Pattern
```typescript
// utils/index.ts - Central export file
export * from './auth';
export * from './database';
export * from './notifications';
export * from './data';
export * from './integrations';
export * from './reports';
export * from './errors';
```

## Best Practices

### Code Organization
1. **Single Responsibility**: Each utility function should have a single, clear purpose
2. **Pure Functions**: Prefer pure functions that don't have side effects
3. **Type Safety**: Use TypeScript for type safety and better developer experience
4. **Documentation**: Document complex utility functions with JSDoc comments

### Error Handling
1. **Consistent Errors**: Use standardized error types and messages
2. **Graceful Degradation**: Handle errors gracefully without breaking the application
3. **Logging**: Log errors with sufficient context for debugging
4. **User-Friendly Messages**: Provide clear error messages for end users

### Performance
1. **Caching**: Implement caching for expensive operations
2. **Lazy Loading**: Load utilities only when needed
3. **Memory Management**: Avoid memory leaks in long-running functions
4. **Optimization**: Profile and optimize frequently used utilities

### Testing
1. **Unit Tests**: Write comprehensive unit tests for all utility functions
2. **Mock Dependencies**: Mock external dependencies in tests
3. **Edge Cases**: Test edge cases and error conditions
4. **Performance Tests**: Test performance of critical utilities

## Usage Examples

### In Appwrite Functions
```typescript
import { validateEmail, formatNotificationMessage, logError } from '../utils';

export default async ({ req, res, log, error }) => {
  try {
    const { email, name } = JSON.parse(req.body);
    
    if (!validateEmail(email)) {
      return res.json({ error: 'Invalid email format' }, 400);
    }
    
    const message = formatNotificationMessage(
      'Welcome {{name}}! Your account has been created.',
      { name }
    );
    
    // Send notification logic here
    
    return res.json({ success: true });
  } catch (err) {
    logError(err, { function: 'welcome-notification' });
    return res.json({ error: 'Internal server error' }, 500);
  }
};
```

### In Schema Validation
```typescript
import { validatePatientId, sanitizeInput } from '../utils';

export const validatePatientData = (data: any) => {
  const errors = [];
  
  if (!validatePatientId(data.patientId)) {
    errors.push('Invalid patient ID format');
  }
  
  data.firstName = sanitizeInput(data.firstName);
  data.lastName = sanitizeInput(data.lastName);
  
  return { isValid: errors.length === 0, errors };
};