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
- **React Hook Form** for form management
  - Used with **Zod** for schema validation
  - Provides real-time validation and error handling

### UI & Styling
- **React Native** built-in components
- **Expo Vector Icons** for iconography
- **Date-fns** for date formatting and calculations
- Responsive design with proper loading states

### API Integration
- **Axios** for HTTP requests
- RESTful API endpoints for patient management
- Authentication context for secure API calls

### Key Libraries Added for FE-03
- **@tanstack/react-query**: ^5.83.0
- **react-hook-form**: ^7.60.0
- **zod**: ^4.0.5
- **date-fns**: ^4.1.0

## Backend Technology Stack
- **AdonisJS** with TypeScript
- **PostgreSQL** database
- **Lucid ORM** for database operations
- RESTful API endpoints for patient management

## API Endpoints Used
### Patient Management
- `GET /patients` - List patients with pagination and filtering
- `GET /patients/:id` - Get patient details
- `POST /patients` - Create new patient
- `PUT /patients/:id` - Update patient
- `GET /patients/:id/immunization-records` - Get patient immunization history

## Development Tools
- **ESLint** for code linting
- **TypeScript** compiler for type checking
- **Expo CLI** for development and building
