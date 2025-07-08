# System Patterns

## System Architecture

The Immunization Records Management System follows a client-server architecture with the following components:

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

1. **Mobile-First Approach**: The primary interface is a mobile application built with React Native to enable staff mobility within healthcare facilities.

2. **API-First Backend**: AdonisJS v6 provides a robust API that can support multiple client applications if needed in the future.

3. **JWT Authentication**: JSON Web Tokens for secure, stateless authentication with role-based permissions.

4. **TanStack Query**: For efficient data fetching, caching, and state management in the frontend.

5. **PostgreSQL Database**: Relational database for structured data storage with strong consistency guarantees.

## Design Patterns

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

1. **Authentication Flow**:
   - Login Screen → Auth Controller → JWT Generation → Protected Routes

2. **Immunization Record Creation**:
   - Immunization Form → API Service → Immunization Records Controller → Database

3. **Notification Generation**:
   - Scheduled Job → Notification Service → Notification Creation → User Dashboard

4. **Reporting Flow**:
   - Reports Screen → Reports Controller → Data Aggregation → Formatted Response

## Critical Implementation Paths

1. **Authentication and Authorization**:
   - Secure login
   - Role-based access control
   - Token management

2. **Patient Management**:
   - Patient registration
   - Patient search and filtering
   - Patient profile management

3. **Immunization Workflow**:
   - Vaccine selection
   - Record creation
   - Return date scheduling

4. **Notification System**:
   - Due date calculation
   - Notification generation
   - Notification delivery

5. **Reporting and Analytics**:
   - Data aggregation
   - Visualization
   - Export functionality
