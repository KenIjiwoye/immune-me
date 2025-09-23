# System Patterns

## System Architecture

The Immunization Records Management System follows a containerized client-server architecture with the following components:

### Containerization Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Docker Compose                          │
│                                                             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │   Frontend  │     │   Backend   │     │  Database   │   │
│  │  (Nginx/80) │────▶│ (Node/3333) │────▶│ (Postgres)  │   │
│  └─────────────┘     └─────────────┘     └─────────────┘   │
│         │                   │                   │           │
│         ▼                   ▼                   ▼           │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │  Frontend   │     │   Backend   │     │  Postgres   │   │
│  │   Volume    │     │   Volume    │     │   Volume    │   │
│  └─────────────┘     └─────────────┘     └─────────────┘   │
│                                                             │
│                 immune-me-network (bridge)                  │
└─────────────────────────────────────────────────────────────┘
```

### Frontend Architecture (React Native)

```
App Entry
  ↓
Navigation Container
  ↓
  ├── Auth Stack
  │   ├── Login Screen
  │   └── Forgot Password Screen
  │
  └── Main Stack
      ├── Dashboard Screen
      ├── Patient List Screen
      ├── Patient Detail Screen
      ├── Immunization Form Screen
      ├── Notifications Screen
      ├── Admin Dashboard Screen (NEW)
      ├── User Management Screen (NEW)
      ├── SMS Management Screen (NEW)
      └── Reports Screen
          ↓
      TanStack Query Client
          ↓
      API Service
          ↓
      AdonisJS Backend
```

### Backend Architecture (AdonisJS v6)

```
HTTP Request
    ↓
Routes
    ↓
Middleware
    ↓
Controllers
    ↓
    ├── Services
    │   ├── NotificationService
    │   ├── ReportingService
    │   ├── SmsService (NEW)
    │   └── SmsTemplateService (NEW)
    │   ↓
    │   Models
    │   ↓
    │   Database
    │
    └── Validators
```

### Database Schema

The system uses a relational database with the following key entities:

- **Users**: Hospital staff with different roles and facility assignments
- **Patients**: Individuals receiving immunizations
- **Facilities**: Healthcare facilities where immunizations are administered
- **Vaccines**: Available vaccines with recommended ages and series information
- **Immunization Records**: Records of administered vaccines
- **Notifications**: Alerts for due immunizations with SMS tracking

## Key Technical Decisions

1. **Containerized Architecture**: Docker and Docker Compose for consistent development, testing, and production environments.
   - Multi-stage builds for optimized container images
   - Service orchestration with Docker Compose
   - Isolated network for secure service communication
   - Volume management for data persistence
   - Health checks for service monitoring

2. **Mobile-First Approach**: The primary interface is a mobile application built with React Native to enable staff mobility within healthcare facilities.
   - Web export for containerized deployment

3. **API-First Backend**: AdonisJS v6 provides a robust API that can support multiple client applications if needed in the future.
   - Containerized for consistent deployment

4. **JWT Authentication**: JSON Web Tokens for secure, stateless authentication with role-based permissions.

5. **TanStack Query**: For efficient data fetching, caching, and state management in the frontend.

6. **PostgreSQL Database**: Relational database for structured data storage with strong consistency guarantees.
   - Containerized with persistent volume for data storage

7. **SMS Integration**: Orange SMS API integration for automated patient communication.
   - OAuth 2.0 authentication with token management
   - Webhook-based delivery receipt processing

## Design Patterns

### Containerization Patterns

1. **Multi-Stage Builds**: Separate build and runtime environments for optimized images.
   - Development dependencies only in build stage
   - Minimal runtime images for production

2. **Service Composition**: Breaking the application into separate containerized services.
   - Frontend, backend, and database as separate services
   - Docker Compose for orchestration

3. **Environment Configuration**: Using environment variables for container configuration.
   - .env file for local development
   - Docker Compose environment variables for production

4. **Volume Management**: Persistent storage for stateful services.
   - Named volume for database data
   - Bind mounts for development (optional)

5. **Health Checks**: Monitoring service health for reliability.
   - Custom health check commands for each service
   - Automatic recovery for failed services

### Frontend Patterns

1. **Component-Based Architecture**: UI is built from reusable components for consistency and maintainability.

2. **Container/Presenter Pattern**: Separation of data fetching logic (containers) from presentation components.

3. **Context API**: For global state management of authentication and user preferences.

4. **Custom Hooks**: Encapsulating reusable logic for data fetching, form handling, etc.

5. **Navigation Patterns**: Stack and tab navigation for intuitive user experience.

### Authentication Patterns

1. **AuthContext Pattern**: Centralized authentication state management using React Context
   - **Implementation**: [`AuthContext`](frontend/app/context/auth.tsx) provides authentication state and methods
   - **Features**: User state, token management, login/logout methods, loading states
   - **Benefits**: Single source of truth for authentication across the app

2. **Secure Token Storage Pattern**: Using expo-secure-store for persistent, secure token storage
   - **Implementation**: Token storage and retrieval in AuthContext
   - **Features**: Encrypted storage, automatic token refresh, secure key management
   - **Benefits**: Tokens persist across app restarts while maintaining security

3. **Protected Route Pattern**: Automatic redirection based on authentication state
   - **Implementation**: Navigation guards in `_layout.tsx` using AuthContext
   - **Features**: Automatic login redirect, protected route access, loading states
   - **Benefits**: Seamless user experience with proper access control

4. **API Integration Pattern**: Centralized API service with authentication headers
   - **Implementation**: [`api.ts`](frontend/app/services/api.ts) service with automatic token injection
   - **Features**: Automatic authentication headers, error handling, response parsing
   - **Benefits**: Consistent API interaction across the application

5. **Form Validation Pattern**: Zod schema validation with React Hook Form
   - **Implementation**: Login form with email/password validation
   - **Features**: Real-time validation, error messages, type safety
   - **Benefits**: Improved user experience and data integrity

### Backend Patterns

1. **MVC Architecture**: Controllers handle requests, Models represent data, and Views (API responses) present data.

2. **Repository Pattern**: Abstraction layer between controllers and data access.

3. **Service Layer**: Business logic encapsulated in service classes.

4. **Middleware Pipeline**: Request processing through a series of middleware for authentication, validation, etc.

5. **Dependency Injection**: For loose coupling and testability.

### SMS Integration Patterns

#### SMS Service Architecture Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                    SMS Service Layer                        │
│                                                             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │     SMS     │     │  Template   │     │   Orange    │   │
│  │ Controller  │────▶│   Service   │────▶│  API Client │   │
│  └─────────────┘     └─────────────┘     └─────────────┘   │
│         │                   │                   │           │
│         ▼                   ▼                   ▼           │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │  Webhook    │     │  Message    │     │  Delivery   │   │
│  │ Processing  │     │ Generation  │     │  Tracking   │   │
│  └─────────────┘     └─────────────┘     └─────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

1. **SMS Service Pattern**: Centralized SMS communication management
   - **Implementation**: [`SmsService`](backend/app/services/sms_service.ts) handles Orange API integration
   - **Features**: OAuth 2.0 authentication, message sending, delivery tracking
   - **Benefits**: Abstracted SMS functionality with comprehensive error handling

2. **Template Engine Pattern**: Healthcare-specific message generation
   - **Implementation**: [`SmsTemplateService`](backend/app/services/sms_template_service.ts)
   - **Features**: Template-based messages, automatic shortening, healthcare abbreviations
   - **Benefits**: Consistent, professional healthcare communication

3. **Webhook Processing Pattern**: Asynchronous delivery receipt handling
   - **Implementation**: Webhook endpoint in [`SmsController`](backend/app/controllers/sms_controller.ts)
   - **Features**: Delivery status updates, error handling, security validation
   - **Benefits**: Real-time delivery tracking and status updates

4. **Retry Mechanism Pattern**: Automatic failure recovery for SMS
   - **Implementation**: Exponential backoff retry logic in SmsService
   - **Features**: Configurable retry limits, failure tracking, rate limiting
   - **Benefits**: Improved delivery reliability and system resilience

### Admin Management Patterns

#### Admin Dashboard Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                   Admin Dashboard                           │
│                                                             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │    User     │     │  Facility   │     │   Vaccine   │   │
│  │ Management  │     │ Management  │     │ Management  │   │
│  └─────────────┘     └─────────────┘     └─────────────┘   │
│         │                   │                   │           │
│         ▼                   ▼                   ▼           │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │   CRUD      │     │   Search    │     │   Role      │   │
│  │ Operations  │     │ & Filter    │     │   Based     │   │
│  └─────────────┘     └─────────────┘     └─────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

1. **Admin Dashboard Pattern**: Centralized administrative control
   - **Implementation**: [`AdminDashboard`](frontend/app/(drawer)/admin/index.tsx)
   - **Features**: Quick action cards, role-based access, visual organization
   - **Benefits**: Efficient administrative workflow and system oversight

2. **User Management Pattern**: Complete staff account lifecycle management
   - **Implementation**: User management screens with CRUD operations
   - **Features**: Role assignment, facility association, search and filtering
   - **Benefits**: Comprehensive staff management with proper access control

3. **Role-Based Access Control Pattern**: Dynamic UI and API access based on user roles
   - **Implementation**: Role checks in components and API endpoints
   - **Features**: Administrator, supervisor, healthcare_worker, doctor roles
   - **Benefits**: Secure, appropriate access to system functionality

4. **Form Management Pattern**: Reusable form components with validation
   - **Implementation**: [`UserForm`](frontend/app/components/UserForm.tsx) component
   - **Features**: React Hook Form integration, validation, error handling
   - **Benefits**: Consistent form behavior and user experience

## Component Relationships

1. **Container Communication**:
   - Frontend Container → Backend Container → Database Container
   - All services connected via Docker network (immune-me-network)
   - Environment variables for service discovery

2. **Authentication Flow**:
   - Login Screen → Auth Controller → JWT Generation → Protected Routes

3. **Immunization Record Creation**:
   - Immunization Form → API Service → Immunization Records Controller → Database

4. **SMS Notification Flow**:
   - Notification Creation → SMS Service → Orange API → Delivery Receipt → Status Update

5. **Admin Management Flow**:
   - Admin Dashboard → User Management → API Service → User Controller → Database

6. **Reporting Flow**:
   - Reports Screen → Reports Controller → Data Aggregation → Formatted Response

7. **Deployment Flow**:
   - Code Changes → Docker Image Build → Container Orchestration → Service Availability

## Critical Implementation Paths

1. **Containerization Infrastructure**:
   - Docker image creation
   - Service orchestration
   - Environment configuration
   - Volume management
   - Network setup

2. **Authentication and Authorization**:
   - Secure login
   - Role-based access control
   - Token management

3. **Patient Management**:
   - Patient registration
   - Patient search and filtering
   - Patient profile management

4. **Immunization Workflow**:
   - Vaccine selection
   - Record creation
   - Return date scheduling

5. **SMS Communication System**:
   - Message template generation
   - Orange API integration
   - Delivery receipt processing
   - Error handling and retry

6. **Admin Management System**:
   - User account lifecycle management
   - Role assignment and access control
   - Facility management
   - System oversight

7. **Notification System**:
   - Due date calculation
   - Notification generation
   - SMS integration
   - Status tracking

8. **Reporting and Analytics**:
   - Data aggregation
   - Visualization
   - Export functionality

9. **Deployment and Operations**:
   - Container health monitoring
   - Database backup and recovery
   - Service scaling
   - Environment-specific configuration

## Enhanced System Patterns

### SMS Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 SMS Integration System                       │
│                                                             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │ Notification│────▶│     SMS     │────▶│   Orange    │   │
│  │   Service   │     │   Service   │     │     API     │   │
│  └─────────────┘     └─────────────┘     └─────────────┘   │
│         │                   │                   │           │
│         ▼                   ▼                   ▼           │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │  Database   │     │  Template   │     │  Webhook    │   │
│  │  Updates    │     │   Engine    │     │ Processing  │   │
│  └─────────────┘     └─────────────┘     └─────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Admin Management Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                Admin Management System                       │
│                                                             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │    Admin    │────▶│    User     │────▶│  Database   │   │
│  │  Dashboard  │     │ Controller  │     │   Updates   │   │
│  └─────────────┘     └─────────────┘     └─────────────┘   │
│         │                   │                   │           │
│         ▼                   ▼                   ▼           │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │    Role     │     │  Facility   │     │   Access    │   │
│  │ Management  │     │ Assignment  │     │  Control    │   │
│  └─────────────┘     └─────────────┘     └─────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Enhanced Notification System

```
┌─────────────────────────────────────────────────────────────┐
│              Enhanced Notification System                    │
│                                                             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │Immunization │────▶│Notification │────▶│     SMS     │   │
│  │   Record    │     │  Creation   │     │   Sending   │   │
│  └─────────────┘     └─────────────┘     └─────────────┘   │
│         │                   │                   │           │
│         ▼                   ▼                   ▼           │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │ Transaction │     │   Status    │     │  Delivery   │   │
│  │   Safety    │     │  Tracking   │     │  Tracking   │   │
│  └─────────────┘     └─────────────┘     └─────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Approach

The implementation of these patterns follows a phased approach:

### Phase 1 (Completed) - Core System
- Containerized infrastructure
- Authentication and authorization
- Basic CRUD operations
- Patient and immunization management
- Notification system foundation

### Phase 2 (Completed) - Enhanced Features
- SMS integration with Orange API
- Admin user management system
- Enhanced vaccine database
- Improved notification reliability
- Comprehensive error handling

### Phase 3 (Current) - Production Readiness
- Performance optimization
- Security hardening
- Comprehensive testing
- Documentation completion
- Deployment preparation

### Phase 4 (Future) - Advanced Features
- Multi-facility coordination
- Advanced analytics and reporting
- Mobile offline capabilities
- Integration with national health systems
- Multilingual support

## Performance and Scalability Patterns

### Database Optimization Patterns
- Proper indexing for frequently queried fields
- Connection pooling for efficient database access
- Query optimization for complex reporting
- Pagination for large datasets

### API Performance Patterns
- Response caching for static data
- Rate limiting for API protection
- Bulk operations for efficiency
- Asynchronous processing for long-running tasks

### SMS Service Patterns
- Rate limiting compliance with Orange API
- Queue management for bulk SMS
- Retry mechanisms with exponential backoff
- Delivery status caching

### Frontend Performance Patterns
- Component memoization for expensive renders
- Lazy loading for large lists
- Image optimization and caching
- Efficient state management with TanStack Query

The system architecture demonstrates a mature, production-ready healthcare management platform with comprehensive SMS communication, administrative controls, and robust notification systems, all built on modern, scalable patterns and technologies.
