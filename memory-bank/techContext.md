# Technical Context

## Frontend Technology Stack

### Core Technologies
- **React Native** with **Expo** for cross-platform mobile development
- **TypeScript** for type safety
- **Expo Router** for file-based routing

### State Management & Data Fetching
- **React Query (TanStack Query)** for server state management
  - Used for patient data fetching, caching, and mutations
  - Implements optimistic updates and error handling
  - **Enhanced for admin management** - User and facility data management
  - **SMS status tracking** - Real-time SMS delivery monitoring
- **React Hook Form** for form management
  - Used with **Zod** for schema validation
  - Provides real-time validation and error handling
  - **Extended for admin forms** - User creation and editing forms

### UI & Styling
- **React Native** built-in components
- **Expo Vector Icons** for iconography
- **Date-fns** for date formatting and calculations
- **React Native Toast Message** for user notifications
- Responsive design with proper loading states

### API Integration
- **Axios** for HTTP requests
- RESTful API endpoints for all entity management
- Authentication context for secure API calls
- **Enhanced error handling** for SMS and admin operations

### Key Libraries Added for Enhanced Features
- **@tanstack/react-query**: ^5.83.0
- **react-hook-form**: ^7.60.0
- **zod**: ^4.0.5
- **date-fns**: ^4.1.0
- **react-native-toast-message**: ^2.3.3
- **@react-native-picker/picker**: ^2.11.1
- **@react-native-community/datetimepicker**: 8.4.1

## Backend Technology Stack

### Core Framework
- **AdonisJS v6** with TypeScript
- **PostgreSQL** database
- **Lucid ORM** for database operations
- RESTful API endpoints for all entity management

### New Service Integrations

#### SMS Integration
- **Orange SMS API** - Complete integration with Orange Liberia SMS service
- **OAuth 2.0 Client** - Secure authentication with Orange API
- **Webhook Processing** - Real-time delivery receipt handling
- **Message Template Engine** - Healthcare-specific message generation

#### Enhanced Authentication
- **JWT Authentication** with role-based access control
- **Role Management** - Administrator, supervisor, healthcare_worker, doctor roles
- **Facility-Based Access Control** - Users assigned to specific facilities

### Key Backend Libraries
- **@adonisjs/core**: ^6.18.0
- **@adonisjs/auth**: ^9.4.0
- **@adonisjs/lucid**: ^21.6.1
- **@adonisjs/cors**: ^2.2.1
- **@vinejs/vine**: ^3.0.1
- **adonisjs-scheduler**: ^2.4.0
- **luxon**: ^3.6.1
- **pg**: ^8.16.3

## New Service Architecture

### SMS Service Layer

#### SmsService (`backend/app/services/sms_service.ts`)
**Capabilities**:
- Orange SMS API integration with OAuth 2.0 authentication
- Liberian phone number validation and formatting (+231)
- Message sending with delivery tracking
- Webhook processing for delivery receipts
- Comprehensive error handling and retry mechanisms
- Rate limiting compliance with Orange API

**Key Methods**:
- `sendSms(recipientPhone, message)` - Send SMS with delivery tracking
- `subscribeToDeliveryReceipts()` - Set up delivery receipt webhooks
- `processDeliveryReceipt(receiptData)` - Handle delivery status updates
- `getConfigurationStatus()` - Check SMS service configuration

#### SmsTemplateService (`backend/app/services/sms_template_service.ts`)
**Capabilities**:
- Healthcare-specific message template generation
- Automatic message optimization for 160-character SMS limit
- Medical terminology abbreviations and shortening
- Template variable replacement and validation
- Multiple message types (reminders, alerts, confirmations)

**Template Types**:
- **Appointment Reminders** - Due vaccination notifications
- **Overdue Alerts** - Urgent vaccination reminders
- **Confirmation Messages** - Vaccination completion confirmations
- **General Notifications** - Custom healthcare messages

**Message Optimization Features**:
- Patient name shortening (e.g., "John Doe" → "John D.")
- Vaccine name abbreviations (e.g., "Bacillus Calmette-Guérin" → "BCG")
- Facility name shortening (e.g., "Health Center" → "HC")
- Date format optimization (e.g., "15-Jan")

### Enhanced Notification Service

#### NotificationService (`backend/app/services/notification_service.ts`)
**Enhanced Features**:
- **SMS Integration** - Automatic SMS sending when notifications are created
- **Transaction Safety** - Atomic operations for notification and SMS creation
- **Delivery Tracking** - Real-time SMS delivery status monitoring
- **Retry Mechanisms** - Automatic retry for failed SMS messages
- **Bulk Processing** - Efficient handling of multiple notifications

**Key Improvements**:
- Eliminated race conditions between batch jobs and immediate creation
- Enhanced error handling with comprehensive logging
- SMS status tracking in database
- Delivery receipt processing integration

## API Endpoints Enhanced

### SMS Management Routes (`/api/sms/`)
- `POST /delivery-receipt` - Webhook for Orange delivery receipts (public)
- `POST /notifications/:id/send` - Send SMS for specific notification
- `POST /notifications/:id/retry` - Retry failed SMS
- `GET /status` - Get SMS status for notifications
- `GET /service-status` - Get SMS service configuration status
- `POST /test` - Test SMS sending (admin only)

### Admin User Management Routes (`/api/users/`)
- `GET /users` - List users with search and filtering
- `GET /users/:id` - Get user details
- `POST /users` - Create new user
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user

### Enhanced Facility Management Routes (`/api/facilities/`)
- `GET /facilities` - List facilities with search and filtering
- `GET /facilities/:id` - Get facility details
- `POST /facilities` - Create new facility
- `PUT /facilities/:id` - Update facility
- `DELETE /facilities/:id` - Delete facility

### Patient Management Routes (`/api/patients/`)
- `GET /patients` - List patients with pagination and filtering
- `GET /patients/:id` - Get patient details
- `POST /patients` - Create new patient
- `PUT /patients/:id` - Update patient
- `GET /patients/:id/immunization-records` - Get patient immunization history

### Vaccine Management Routes (`/api/vaccines/`)
- `GET /vaccines` - List vaccines with filtering
- `GET /vaccines/:id` - Get vaccine details
- `POST /vaccines` - Create new vaccine (admin only)
- `PUT /vaccines/:id` - Update vaccine (admin only)
- `DELETE /vaccines/:id` - Delete vaccine (admin only)

### Immunization Records Routes (`/api/immunization-records/`)
- `GET /immunization-records` - List immunization records
- `GET /immunization-records/:id` - Get record details
- `POST /immunization-records` - Create new record
- `PUT /immunization-records/:id` - Update record
- `DELETE /immunization-records/:id` - Delete record

### Notifications Routes (`/api/notifications/`)
- `GET /notifications` - List notifications with filtering
- `GET /notifications/:id` - Get notification details
- `PUT /notifications/:id` - Update notification status
- `POST /notifications/:id/sms` - Send SMS for notification

## Database Schema Enhancements

### SMS Tracking Fields (Added to `notifications` table)
```sql
sms_message_id VARCHAR(255)     -- Orange API message ID
sms_status ENUM                 -- not_sent, sent, delivered, failed
sms_sent_at TIMESTAMP          -- When SMS was sent
sms_delivered_at TIMESTAMP     -- When SMS was delivered
sms_error_message TEXT         -- Error message if failed
sms_error_code VARCHAR(50)     -- Error code if failed
sms_retry_count INTEGER        -- Number of retry attempts
sms_last_retry_at TIMESTAMP    -- Last retry timestamp
```

### Enhanced User Model
```sql
role ENUM                      -- administrator, supervisor, healthcare_worker, doctor
facility_id INTEGER            -- Reference to assigned facility
```

### Enhanced Vaccine Model
```sql
vaccine_series VARCHAR(100)    -- Vaccine series grouping (e.g., "OPV", "Penta")
sequence_number INTEGER       -- Sequence within series (e.g., 1, 2, 3)
is_supplementary BOOLEAN      -- Routine vs supplementary vaccine
```

## Environment Configuration

### SMS Service Configuration
```env
# SMS Service Configuration
SMS_ENABLED=true
ORANGE_SMS_API_URL=https://api.orange.com
ORANGE_SMS_SENDER_ADDRESS=tel:+231987654321
ORANGE_SMS_CLIENT_ID=your-client-id
ORANGE_SMS_CLIENT_SECRET=your-client-secret
ORANGE_SMS_AUTHORIZATION_HEADER=Basic base64-encoded-credentials
ORANGE_SMS_TOKEN_URL=https://api.orange.com/oauth/v3/token
ORANGE_SMS_WEBHOOK_URL=https://your-domain.com/api/sms/delivery-receipt

# Optional SMS Settings
SMS_MAX_RETRIES=3
SMS_RETRY_DELAY_MS=2000
SMS_RATE_LIMIT_PER_MINUTE=30
```

### Database Configuration
```env
DB_CONNECTION=pg
DB_HOST=localhost
DB_PORT=5432
DB_USER=immune_me_user
DB_PASSWORD=secure_password
DB_DATABASE=immune_me_db
```

## Development Tools

### Backend Development
- **ESLint** for code linting with AdonisJS configuration
- **Prettier** for code formatting
- **TypeScript** compiler for type checking
- **Japa** for testing framework
- **Hot-Hook** for development hot reloading

### Frontend Development
- **ESLint** for code linting with Expo configuration
- **TypeScript** compiler for type checking
- **Expo CLI** for development and building
- **React Native Debugger** for debugging

### Testing Infrastructure
- **Unit Testing** - Jest-based testing for services and utilities
- **Integration Testing** - API endpoint testing with test database
- **E2E Testing** - Complete workflow testing
- **SMS Testing** - Mock Orange API for SMS functionality testing

## Performance Optimizations

### Frontend Performance
- **Component Memoization** - React.memo for expensive components
- **Query Optimization** - TanStack Query caching and background updates
- **Lazy Loading** - Code splitting for admin screens
- **Image Optimization** - Expo image optimization and caching

### Backend Performance
- **Database Indexing** - Proper indexes for frequently queried fields
- **Connection Pooling** - Efficient database connection management
- **Query Optimization** - Optimized Lucid ORM queries
- **Caching Strategy** - Response caching for static data

### SMS Performance
- **Rate Limiting** - Compliance with Orange API limits
- **Bulk Processing** - Efficient handling of multiple SMS
- **Queue Management** - Background processing for SMS sending
- **Retry Optimization** - Exponential backoff for failed messages

## Security Enhancements

### SMS Security
- **Webhook Validation** - Secure webhook endpoint processing
- **Token Management** - Secure OAuth token storage and refresh
- **Phone Number Validation** - Proper Liberian number format validation
- **Message Content Filtering** - Healthcare-appropriate content validation

### Admin Security
- **Role-Based Access Control** - Granular permissions for admin functions
- **Facility Isolation** - Users can only access their assigned facility data
- **Audit Logging** - Comprehensive logging of admin actions
- **Input Validation** - Strict validation for all admin operations

### API Security
- **JWT Authentication** - Secure token-based authentication
- **CORS Configuration** - Proper cross-origin request handling
- **Rate Limiting** - API endpoint protection
- **Input Sanitization** - Protection against injection attacks

## Monitoring and Logging

### SMS Monitoring
- **Delivery Rate Tracking** - Monitor SMS success rates
- **Error Pattern Analysis** - Identify common SMS failures
- **Performance Metrics** - Track SMS sending performance
- **Orange API Health** - Monitor external service availability

### System Monitoring
- **Database Performance** - Query performance and connection monitoring
- **API Response Times** - Track endpoint performance
- **Error Rates** - Monitor application error patterns
- **User Activity** - Track admin and user actions

### Logging Strategy
- **Structured Logging** - JSON-formatted logs with context
- **Log Levels** - Appropriate log levels for different events
- **Error Tracking** - Comprehensive error logging and alerting
- **Audit Trails** - Complete audit logs for compliance

## Deployment Architecture

### Container Configuration
- **Multi-stage Docker builds** for optimized images
- **Environment-specific configurations** for development/production
- **Health checks** for all services
- **Volume management** for persistent data

### Production Considerations
- **SSL/TLS Configuration** - Secure HTTPS endpoints
- **Database Backup** - Automated backup strategies
- **Scaling Strategy** - Horizontal scaling preparation
- **Monitoring Integration** - Production monitoring setup

## Integration Capabilities

### External Service Integration
- **Orange SMS API** - Complete SMS service integration
- **Webhook Processing** - Real-time external event handling
- **OAuth 2.0 Client** - Secure third-party authentication

### Future Integration Readiness
- **API-First Design** - Ready for additional client applications
- **Microservice Architecture** - Prepared for service decomposition
- **Event-Driven Architecture** - Foundation for real-time features
- **Multi-tenant Support** - Architecture supports multiple facilities

## Technology Evolution Summary

### Major Additions
1. **SMS Communication Layer** - Complete Orange API integration with healthcare-optimized messaging
2. **Admin Management System** - Full user and facility administration capabilities
3. **Enhanced Security** - Role-based access control with facility isolation
4. **Improved Reliability** - Transaction-safe operations and comprehensive error handling
5. **Production Monitoring** - Comprehensive logging and performance tracking

### Architecture Maturity
The system has evolved from a basic immunization tracker to a comprehensive healthcare management platform with:
- **Enterprise-grade SMS integration** with delivery tracking and retry mechanisms
- **Complete administrative controls** for multi-facility healthcare organizations
- **Production-ready reliability** with comprehensive error handling and monitoring
- **Scalable architecture** supporting growth and additional feature integration
- **Healthcare-specific optimizations** for immunization management workflows

This technical foundation provides a robust, secure, and scalable platform for healthcare immunization management with advanced communication capabilities and comprehensive administrative controls.
