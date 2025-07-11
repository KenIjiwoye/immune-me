# Testing the Core Data Models

This document provides instructions on how to test the core data models for the Immunization Records Management System.

## Prerequisites

- Docker and Docker Compose installed on your system
- The `.env` file properly configured with database credentials

## Running the Tests

### 1. Start the Development Environment

First, start the development environment using Docker Compose:

```bash
docker-compose -f docker-compose.dev.yml up -d
```

This will start the backend, frontend, and database services in development mode.

### 2. Run the Test Command

Once the services are up and running, execute the test command in the backend container:

```bash
docker exec -it immune-me-backend-dev node ace test:models
```

This command will:
1. Create a test facility
2. Create a test user associated with the facility
3. Create a test vaccine
4. Create a test patient
5. Load and verify relationships between the models

### 3. Expected Output

If everything is working correctly, you should see output similar to:

```
✓ Created facility: Test Hospital
✓ Created user: Test User
✓ User belongs to facility: Test Hospital
✓ Created vaccine: Test Vaccine
✓ Created patient: Test Patient
✓ Patient belongs to facility: Test Hospital
✓ Patient's health worker: Test User
✓ All models tested successfully!
```

## Troubleshooting

If you encounter any issues:

1. Make sure all migrations have been run:
   ```bash
   docker exec -it immune-me-backend-dev node ace migration:run
   ```

2. Check the database connection:
   ```bash
   docker exec -it immune-me-backend-dev node ace db:show
   ```

3. Inspect the logs for errors:
   ```bash
   docker logs immune-me-backend-dev
   ```

## Models Implemented

The following models have been implemented:

1. User - Represents healthcare workers and administrators
2. Facility - Represents healthcare facilities
3. Patient - Represents patients receiving immunizations
4. Vaccine - Represents available vaccines
5. ImmunizationRecord - Represents administered vaccines
6. Notification - Represents immunization reminders and alerts

Each model includes appropriate relationships to other models as specified in the requirements.