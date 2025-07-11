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
    │   ↓
    │   Models
    │   ↓
    │   Database
    │
    └── Validators
```

### Database Schema

The system uses a relational database with the following key entities:

- **Users**: Hospital staff with different roles
- **Patients**: Individuals receiving immunizations
- **Facilities**: Healthcare facilities where immunizations are administered
- **Vaccines**: Available vaccines with recommended ages
- **Immunization Records**: Records of administered vaccines
- **Notifications**: Alerts for due immunizations

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

### Backend Patterns

1. **MVC Architecture**: Controllers handle requests, Models represent data, and Views (API responses) present data.

2. **Repository Pattern**: Abstraction layer between controllers and data access.

3. **Service Layer**: Business logic encapsulated in service classes.

4. **Middleware Pipeline**: Request processing through a series of middleware for authentication, validation, etc.

5. **Dependency Injection**: For loose coupling and testability.

## Component Relationships

1. **Container Communication**:
   - Frontend Container → Backend Container → Database Container
   - All services connected via Docker network (immune-me-network)
   - Environment variables for service discovery

2. **Authentication Flow**:
   - Login Screen → Auth Controller → JWT Generation → Protected Routes

3. **Immunization Record Creation**:
   - Immunization Form → API Service → Immunization Records Controller → Database

4. **Notification Generation**:
   - Scheduled Job → Notification Service → Notification Creation → User Dashboard

5. **Reporting Flow**:
   - Reports Screen → Reports Controller → Data Aggregation → Formatted Response

6. **Deployment Flow**:
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

5. **Notification System**:
   - Due date calculation
   - Notification generation
   - Notification delivery

6. **Reporting and Analytics**:
   - Data aggregation
   - Visualization
   - Export functionality

7. **Deployment and Operations**:
   - Container health monitoring
   - Database backup and recovery
   - Service scaling
   - Environment-specific configuration
