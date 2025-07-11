# Technical Context

## Technologies Used

### Containerization

1. **Docker**: Container platform for application packaging and deployment
   - Implementation: Multi-stage builds for optimized images
   - Features: Isolated environments, consistent deployments
   - Benefits: Development/production parity, simplified setup

2. **Docker Compose**: Multi-container orchestration tool
   - Features: Service definition, networking, volume management
   - Benefits: Simplified multi-container management
   - Implementation: Orchestrating frontend, backend, and database services

3. **Container Networking**: Docker bridge network
   - Implementation: Custom `immune-me-network` for service communication
   - Features: Isolated network for secure service communication
   - Benefits: Service discovery, security through isolation

4. **Volume Management**: Docker volumes for data persistence
   - Implementation: Named volume for PostgreSQL data
   - Features: Data persistence across container restarts
   - Benefits: Reliable data storage, simplified backups

5. **Health Checks**: Container health monitoring
   - Implementation: Custom health check commands for each service
   - Features: Automatic service monitoring
   - Benefits: Improved reliability, automatic recovery

### Frontend

1. **React Native**: Cross-platform mobile application framework
   - Version: Latest stable
   - Implementation: Using Expo managed workflow
   - Containerization: Multi-stage Docker build with Nginx for serving web build

2. **Expo**: Development platform for React Native
   - Features: File-based routing, development builds, hot reloading
   - Benefits: Simplified development workflow, access to native APIs
   - Containerization: Web export for container deployment

3. **TanStack Query**: Data fetching and state management library
   - Features: Caching, background updates, pagination
   - Benefits: Reduced boilerplate, optimized API calls

4. **Navigation**: React Navigation for screen management
   - Implementation: Stack and tab navigation patterns
   - Features: Deep linking, screen transitions

5. **UI Components**: Mix of native components and custom-built UI elements
   - Styling: React Native StyleSheet
   - Responsive design for various device sizes

### Backend

1. **AdonisJS v6**: Node.js web framework
   - Features: MVC architecture, built-in authentication, ORM
   - Benefits: TypeScript support, structured development
   - Containerization: Multi-stage Docker build with optimized production image

2. **PostgreSQL**: Relational database
   - Features: ACID compliance, JSON support, robust indexing
   - Benefits: Data integrity, complex query support
   - Configuration: Connection configured in AdonisJS using environment variables
   - Connection Key: 'pg' (PostgreSQL client)
   - Containerization: Official PostgreSQL Alpine image with persistent volume

3. **JWT Authentication**: Token-based authentication
   - Implementation: AdonisJS Auth module
   - Features: Role-based access control, token refresh

4. **Validators**: VineJS for request validation
   - Features: Schema-based validation, custom rules
   - Benefits: Secure input handling, error messaging

5. **Lucid ORM**: Database ORM for AdonisJS
   - Features: Query builder, migrations, relationships
   - Benefits: Type-safe database operations

## Development Setup

### Containerized Development Environment

1. **Docker**: v20.10.0+ for containerization
2. **Docker Compose**: v2.0.0+ for multi-container orchestration
3. **Git**: For version control
4. **Environment Variables**: Configured via .env file

### Local Development Environment (Alternative)

1. **Node.js**: v18+ for backend and frontend development
2. **npm**: Package management
3. **PostgreSQL**: Local database instance
4. **Expo CLI**: For React Native development
5. **AdonisJS CLI**: For backend development

### Development Workflow with Containers

1. **Initial Setup**:
   - Clone repository
   - Configure .env file
   - Run `docker-compose up -d` to start all services

2. **Backend Development**:
   - Edit files in the `backend/` directory
   - Rebuild with `docker-compose up -d --build backend`
   - Run migrations with `docker exec -it immune-me-backend node ace migration:run`
   - View logs with `docker-compose logs backend`

3. **Frontend Development**:
   - Edit files in the `frontend/` directory
   - Rebuild with `docker-compose up -d --build frontend`
   - View logs with `docker-compose logs frontend`

4. **Database Management**:
   - Connect to database with `docker exec -it immune-me-db psql -U ${DB_USER} -d ${DB_DATABASE}`
   - Persistent storage via Docker volume
   - Environment variables for database credentials

5. **Advanced Development Setup**:
   - Mount local directories as volumes for hot reloading
   - Configure volume mounts in docker-compose.yml

## Technical Constraints

### Performance Requirements

1. **Response Time**: API endpoints should respond within 500ms
2. **App Launch Time**: Mobile app should launch within 2 seconds
3. **Offline Capability**: Limited functionality when offline (future consideration)

### Security Requirements

1. **Data Encryption**: Sensitive data encrypted at rest and in transit
2. **Authentication**: Secure login with password hashing
3. **Authorization**: Role-based access control
4. **Input Validation**: All user inputs validated and sanitized
5. **Audit Logging**: Track sensitive operations

### Scalability Considerations

1. **Database Indexing**: Optimize for common queries
2. **Connection Pooling**: Efficient database connection management
3. **Caching Strategy**: Cache frequently accessed data
4. **Horizontal Scaling**: Backend designed for potential load balancing

## Dependencies

### Frontend Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-native": "^0.73.0",
    "expo": "^50.0.0",
    "@tanstack/react-query": "^5.0.0",
    "@react-navigation/native": "^6.0.0",
    "@react-navigation/stack": "^6.0.0",
    "@react-native-picker/picker": "^2.0.0",
    "@react-native-community/datetimepicker": "^7.0.0"
  }
}
```

### Backend Dependencies

```json
{
  "dependencies": {
    "@adonisjs/auth": "^9.4.0",
    "@adonisjs/core": "^6.18.0",
    "@adonisjs/cors": "^2.2.1",
    "@adonisjs/lucid": "^21.6.1",
    "@vinejs/vine": "^3.0.1",
    "luxon": "^3.6.1",
    "pg": "^8.16.3", // PostgreSQL client for Node.js
    "reflect-metadata": "^0.2.2"
  }
}
```

## Tool Usage Patterns

### Version Control

- **Git**: For source code management
- **GitHub**: Repository hosting and collaboration
- **Branching Strategy**: Feature branches with pull requests

### Testing

- **Backend**: Japa testing framework
- **Frontend**: React Native Testing Library (planned)
- **API Testing**: Automated endpoint testing

### Deployment

- **Containerized Deployment**: Docker Compose for all services
  - Production-ready Docker images with multi-stage builds
  - Environment variable configuration for different environments
  - Volume management for data persistence
  - Health checks for service monitoring

- **Backend**: Render.com (planned)
  - Container deployment with Docker image
  - Environment variables configured in Render.com dashboard

- **Database**: Cloud PostgreSQL (planned)
  - Local development: PostgreSQL in Docker container
  - Production: Managed PostgreSQL service or containerized deployment

- **Frontend**: App stores and enterprise distribution (planned)
  - Web version deployed via containerized Nginx
  - Native apps built from the same codebase

### Monitoring

- **Logging**: Pino for structured logging
- **Error Tracking**: To be determined
- **Performance Monitoring**: To be determined
