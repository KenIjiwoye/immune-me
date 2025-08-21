# Appwrite Functions

This directory contains Appwrite Cloud Functions that implement the core business logic for the Immune Me application.

## Overview

Appwrite Functions are serverless functions that run in response to events or HTTP requests. They provide a way to implement complex business logic, data processing, and integrations that go beyond simple CRUD operations.

## Function Categories

### Notifications (`notifications/`)
Functions related to notification management and delivery:

- **Notification Triggers**: Functions that create notifications based on system events (due immunizations, missed appointments, etc.)
- **Email/SMS Delivery**: Functions that handle notification delivery through various channels
- **Notification Scheduling**: Functions that manage scheduled and recurring notifications
- **Push Notifications**: Functions for mobile push notification delivery

### Reports (`reports/`)
Functions for generating and processing reports:

- **Coverage Reports**: Functions that calculate immunization coverage statistics
- **Due Immunizations**: Functions that generate lists of patients with due immunizations
- **Facility Performance**: Functions that analyze facility-level performance metrics
- **Age Distribution**: Functions that calculate age-based immunization statistics
- **Export Functions**: Functions that generate PDF/Excel reports for download

### Data Sync (`data-sync/`)
Functions for data synchronization and integration:

- **Migration Functions**: Functions that handle data migration from existing systems
- **External API Sync**: Functions that synchronize data with external health systems
- **Backup Functions**: Functions that create and manage data backups
- **Data Validation**: Functions that validate and clean imported data
- **Batch Processing**: Functions that handle bulk data operations

## Function Structure

Each function directory should contain:

- `src/` - Function source code (TypeScript/JavaScript)
- `package.json` - Function dependencies and configuration
- `appwrite.json` - Appwrite function configuration
- `README.md` - Function-specific documentation
- `.env.example` - Environment variables template

## Development Guidelines

### Function Naming
- Use descriptive names that clearly indicate the function's purpose
- Follow kebab-case naming convention (e.g., `send-due-immunization-reminders`)
- Include the trigger type in the name when relevant (e.g., `schedule-weekly-reports`)

### Error Handling
- Implement comprehensive error handling and logging
- Use Appwrite's logging capabilities for debugging
- Return appropriate HTTP status codes and error messages

### Performance
- Optimize functions for cold start performance
- Use connection pooling for database operations
- Implement proper timeout handling

### Security
- Validate all input parameters
- Use Appwrite's built-in authentication and authorization
- Sanitize data before processing
- Follow principle of least privilege for function permissions

## Deployment

Functions are deployed using the Appwrite CLI:

```bash
# Deploy all functions
appwrite deploy function

# Deploy specific function
appwrite deploy function --functionId=<function-id>
```

## Environment Variables

Common environment variables used across functions:

- `APPWRITE_ENDPOINT` - Appwrite server endpoint
- `APPWRITE_PROJECT_ID` - Project ID
- `APPWRITE_API_KEY` - API key for server-side operations
- `SMTP_HOST` - Email server configuration
- `SMS_API_KEY` - SMS service API key
- `NOTIFICATION_WEBHOOK_URL` - External notification webhook

## Monitoring and Logging

- Use Appwrite's built-in function logs for debugging
- Implement structured logging with appropriate log levels
- Monitor function execution times and error rates
- Set up alerts for critical function failures