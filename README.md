# Immune-Me: Immunization Records Management System

## Overview

Immune-Me is a containerized application designed to help hospital staff manage patient immunization records. The system enables healthcare providers to create, update, and track immunization records, as well as receive notifications for patients due for immunizations.

### Containerized Architecture

The application consists of three main services, all containerized using Docker:

1. **Frontend** (`frontend`): A React Native/Expo application built for web, served via Nginx
2. **Backend** (`backend`): An AdonisJS v6 API server
3. **Database** (`db`): PostgreSQL 15 database for data storage

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │     │   Backend   │     │  Database   │
│  (Nginx/80) │────▶│ (Node/3333) │────▶│ (Postgres)  │
└─────────────┘     └─────────────┘     └─────────────┘
```

All services are connected through a Docker network (`immune-me-network`) and use environment variables for configuration.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- [Docker](https://docs.docker.com/get-docker/) (version 20.10.0 or higher)
- [Docker Compose](https://docs.docker.com/compose/install/) (version 2.0.0 or higher)
- Git (for cloning the repository)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd immune-me
```

### 2. Configure Environment Variables

The application uses environment variables for configuration. A sample `.env` file is provided, but you should review and modify it for your environment:

```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your preferred text editor
nano .env
```

The following environment variables are required:

```
# Database Configuration
DB_USER=root
DB_PASSWORD=root
DB_DATABASE=immune_me

# Application Key
APP_KEY=your_secure_application_key
```

> **Note**: For production environments, make sure to use strong, unique passwords and a secure application key.

### 3. Build and Start the Containers

Once you've configured your environment variables, you can build and start the containers:

```bash
docker-compose up -d
```

This command will:
- Build the Docker images for the frontend and backend
- Pull the PostgreSQL image
- Create and start all containers
- Set up the network and volumes

The `-d` flag runs the containers in detached mode (in the background).

### 4. Verify the Setup

After the containers are running, you can access:

- Frontend: http://localhost:80
- Backend API: http://localhost:3333
- Database: localhost:5432 (accessible via database clients)

## Docker Commands

Here are some useful Docker commands for managing your containers:

### Basic Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs for all services
docker-compose logs

# View logs for a specific service
docker-compose logs backend
docker-compose logs frontend
docker-compose logs db

# Restart a specific service
docker-compose restart backend
```

### Advanced Commands

```bash
# Rebuild images and start containers
docker-compose up -d --build

# Stop and remove containers, networks, and volumes
docker-compose down -v

# View running containers
docker ps

# Execute commands in a running container
docker exec -it immune-me-backend sh
docker exec -it immune-me-frontend sh
docker exec -it immune-me-db psql -U ${DB_USER} -d ${DB_DATABASE}
```

## Development Workflow

### Making Changes to the Frontend

1. Edit the files in the `frontend/` directory
2. The changes will require rebuilding the frontend container:

```bash
docker-compose up -d --build frontend
```

### Making Changes to the Backend

1. Edit the files in the `backend/` directory
2. Rebuild the backend container:

```bash
docker-compose up -d --build backend
```

### Database Migrations

To run database migrations:

```bash
docker exec -it immune-me-backend node ace migration:run
```

To create a new migration:

```bash
docker exec -it immune-me-backend node ace make:migration create_new_table
```

### Working with Development Mode

For active development, you might want to mount your local directories into the containers to see changes without rebuilding. You can modify the `docker-compose.yml` file to add volumes:

```yaml
services:
  backend:
    # ... other configuration
    volumes:
      - ./backend:/app
      - /app/node_modules

  frontend:
    # ... other configuration
    volumes:
      - ./frontend:/app
      - /app/node_modules
```

> **Note**: This approach may require additional configuration for hot reloading.

## Troubleshooting Common Issues

### Container Fails to Start

If a container fails to start, check the logs:

```bash
docker-compose logs <service-name>
```

Common issues include:

- **Database connection errors**: Ensure the database container is running and the environment variables are correctly set
- **Port conflicts**: Make sure ports 80, 3333, and 5432 are not in use by other applications

### Database Connection Issues

If the backend can't connect to the database:

1. Ensure the database container is running:
   ```bash
   docker ps | grep immune-me-db
   ```

2. Check if the environment variables in the backend container match the database settings:
   ```bash
   docker exec immune-me-backend env | grep DB_
   ```

3. Try connecting to the database directly:
   ```bash
   docker exec -it immune-me-db psql -U ${DB_USER} -d ${DB_DATABASE}
   ```

### Frontend Not Loading

If the frontend is not loading properly:

1. Check if the Nginx server is running:
   ```bash
   docker logs immune-me-frontend
   ```

2. Verify that the backend API is accessible from the frontend container:
   ```bash
   docker exec -it immune-me-frontend wget -O- http://backend:3333/api/health
   ```

### Rebuilding from Scratch

If you need to start fresh:

```bash
# Stop and remove all containers, networks, and volumes
docker-compose down -v

# Remove all images related to the project
docker rmi $(docker images | grep immune-me | awk '{print $3}')

# Rebuild and start
docker-compose up -d --build
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [AdonisJS Documentation](https://docs.adonisjs.com/guides/introduction)
- [Expo Documentation](https://docs.expo.dev/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## Project Structure

```
immune-me/
├── .env                  # Environment variables
├── docker-compose.yml    # Docker Compose configuration
├── backend/              # AdonisJS backend application
│   ├── Dockerfile        # Backend Docker configuration
│   └── ...
├── frontend/             # React Native/Expo frontend application
│   ├── Dockerfile        # Frontend Docker configuration
│   └── ...
└── README.md             # This file
```

## License

[Your License Information]