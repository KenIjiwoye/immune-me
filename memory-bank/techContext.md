# Technical Context

## Technologies Used

### Frontend

1. **React Native**: Cross-platform mobile application framework
   - Version: Latest stable
   - Implementation: Using Expo managed workflow

2. **Expo**: Development platform for React Native
   - Features: File-based routing, development builds, hot reloading
   - Benefits: Simplified development workflow, access to native APIs

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

2. **PostgreSQL**: Relational database
   - Features: ACID compliance, JSON support, robust indexing
   - Benefits: Data integrity, complex query support

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

### Local Development Environment

1. **Node.js**: v18+ for backend and frontend development
2. **npm**: Package management
3. **PostgreSQL**: Local database instance
4. **Expo CLI**: For React Native development
5. **AdonisJS CLI**: For backend development

### Development Workflow

1. **Backend Development**:
   - Run `npm run dev` in the backend directory
   - Hot reloading enabled for rapid development
   - API testing via HTTP client (e.g., Postman, Insomnia)

2. **Frontend Development**:
   - Run `npx expo start` in the frontend directory
   - Test on iOS simulator, Android emulator, or physical devices
   - Expo Go for quick testing on physical devices

3. **Database Management**:
   - Migrations for schema changes
   - Seeders for test data

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
    "pg": "^8.16.3",
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

- **Backend**: Render.com (planned)
- **Database**: Cloud PostgreSQL (planned)
- **Frontend**: App stores and enterprise distribution (planned)

### Monitoring

- **Logging**: Pino for structured logging
- **Error Tracking**: To be determined
- **Performance Monitoring**: To be determined
