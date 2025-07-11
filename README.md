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

## Development vs. Production Modes

### Development Mode

The project includes a comprehensive development setup with hot reloading for both frontend and backend. This allows you to see your changes immediately without rebuilding containers.

#### Starting Development Mode

To start the application in development mode:

```bash
docker-compose -f docker-compose.dev.yml up -d
```

This will:
- Start the backend in development mode with hot reloading
- Start the frontend Expo development server
- Set up volume mounts for live code updates
- Configure the database with development settings

#### Accessing Development Services

- **Frontend Expo DevTools**: http://localhost:19002
  - Use this to manage your Expo development environment
  - Access QR codes for mobile testing
  - View logs and debugging information

- **Frontend Web App**: http://localhost:19006
  - The web version of your React Native app
  - Automatically refreshes when you make changes

- **Backend API**: http://localhost:3333
  - Direct access to your AdonisJS API
  - Includes detailed error messages and debugging information

- **Database**: localhost:5432
  - Connect using any PostgreSQL client with your configured credentials

#### Making Changes in Development Mode

With development mode active:

1. **Frontend Changes**:
   - Edit any files in the `frontend/` directory
   - Changes are automatically detected by the Expo dev server
   - The browser will refresh to show your changes
   - Check the container logs for any errors: `docker-compose -f docker-compose.dev.yml logs -f frontend`

2. **Backend Changes**:
   - Edit any files in the `backend/` directory
   - The AdonisJS server will automatically restart
   - Changes are applied immediately
   - View logs to confirm changes: `docker-compose -f docker-compose.dev.yml logs -f backend`

3. **Testing on Mobile Devices**:
   - Access the Expo DevTools at http://localhost:19002
   - Scan the QR code with the Expo Go app on your device
   - Ensure your mobile device is on the same network as your development machine

#### Running Database Migrations in Development Mode

To run database migrations in development mode:

```bash
# Run migrations
docker exec -it immune-me-backend-dev node ace migration:run

# Roll back the last batch of migrations
docker exec -it immune-me-backend-dev node ace migration:rollback

# Create a new migration
docker exec -it immune-me-backend-dev node ace make:migration create_new_table

# Run seeders
docker exec -it immune-me-backend-dev node ace db:seed
```

#### Installing New Dependencies in Development Mode

To add new packages to your project:

```bash
# For backend dependencies
docker exec -it immune-me-backend-dev npm install package-name

# For frontend dependencies
docker exec -it immune-me-frontend-dev npm install package-name
```

### Production Mode

Production mode is optimized for performance, security, and reliability. It uses multi-stage Docker builds to create minimal, efficient containers.

#### Starting Production Mode

```bash
docker-compose up -d
```

#### Accessing Production Services

- **Frontend**: http://localhost:80
  - Served by Nginx for optimal performance
  - Static files are pre-built and optimized

- **Backend API**: http://localhost:3333
  - Optimized for performance
  - Minimal error output for security

- **Database**: localhost:5432
  - Same connection details as development

#### Making Changes in Production Mode

Changes in production mode require rebuilding the containers:

1. **Frontend Changes**:
   - Edit the files in the `frontend/` directory
   - Rebuild the frontend container:
   ```bash
   docker-compose up -d --build frontend
   ```

2. **Backend Changes**:
   - Edit the files in the `backend/` directory
   - Rebuild the backend container:
   ```bash
   docker-compose up -d --build backend
   ```

#### Running Database Migrations in Production Mode

```bash
# Run migrations
docker exec -it immune-me-backend node ace migration:run

# Create a new migration (typically done in development first)
docker exec -it immune-me-backend node ace make:migration create_new_table
```

### Comparison: Development vs. Production

| Feature | Development Mode | Production Mode |
|---------|-----------------|----------------|
| **Configuration** | `docker-compose.dev.yml` | `docker-compose.yml` |
| **Frontend** | Expo development server | Nginx serving static files |
| **Backend** | Hot reloading enabled | Optimized build |
| **Code Changes** | Immediate via volume mounts | Requires container rebuild |
| **Error Reporting** | Verbose, developer-friendly | Minimal, security-focused |
| **Performance** | Optimized for development speed | Optimized for runtime performance |
| **Resource Usage** | Higher (dev tools, watchers) | Lower (optimized builds) |
| **Ports** | Multiple (19000-19002, 8081, 3333, 5432) | Minimal (80, 3333, 5432) |

### When to Use Each Mode

- **Use Development Mode When**:
  - Actively developing new features
  - Debugging issues
  - Testing changes quickly
  - Working on the frontend with hot reloading
  - Needing access to development tools like Expo DevTools

- **Use Production Mode When**:
  - Testing the final build
  - Measuring performance
  - Deploying to staging or production environments
  - Conducting user acceptance testing
  - Simulating the production environment locally

## Troubleshooting Common Issues

### Running Frontend Locally (Alternative to Docker)

For React Native/Expo development, you can run the frontend locally on your machine instead of in Docker. This approach is simpler and avoids potential Docker configuration issues, especially when using Expo Go app and Expo development builds for testing on physical devices.

#### Setup for Local Frontend Development

1. **Install Node.js and npm** on your local machine if not already installed
   ```bash
   # Check if Node.js is installed
   node --version
   npm --version
   ```

2. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Start the Expo development server**
   ```bash
   npm start
   # Or for specific platforms
   npm run android
   npm run ios
   npm run web
   ```

4. **Connect to the backend**
   - The backend will still run in Docker
   - Update your frontend API configuration to point to the Docker backend service
   - Typically this would be `http://localhost:3333` for the backend API

#### Benefits of Local Frontend Development

- Simpler setup without Docker configuration issues
- Direct access to Expo tools and device simulators
- Faster hot reloading
- Better integration with local development tools and IDEs
- Easier debugging of frontend code

#### When to Use This Approach

- When developing primarily for mobile using Expo Go or development builds
- If you encounter persistent Docker issues with the frontend container
- When you need direct access to native device features during development

### General Troubleshooting

#### Container Fails to Start

If a container fails to start, check the logs:

```bash
# For production mode
docker-compose logs <service-name>

# For development mode
docker-compose -f docker-compose.dev.yml logs <service-name>
```

Common issues include:

- **Database connection errors**: Ensure the database container is running and the environment variables are correctly set
- **Port conflicts**: Make sure required ports are not in use by other applications
  - Production: 80, 3333, 5432
  - Development: 19000-19002, 8081, 3333, 5432

#### Database Connection Issues

If the backend can't connect to the database:

1. Ensure the database container is running:
   ```bash
   # For production
   docker ps | grep immune-me-db
   
   # For development
   docker ps | grep immune-me-db-dev
   ```

2. Check if the environment variables in the backend container match the database settings:
   ```bash
   # For production
   docker exec immune-me-backend env | grep DB_
   
   # For development
   docker exec immune-me-backend-dev env | grep DB_
   ```

3. Try connecting to the database directly:
   ```bash
   # For production
   docker exec -it immune-me-db psql -U ${DB_USER} -d ${DB_DATABASE}
   
   # For development
   docker exec -it immune-me-db-dev psql -U ${DB_USER} -d ${DB_DATABASE}
   ```

#### Rebuilding from Scratch

If you need to start fresh:

```bash
# For production mode
docker-compose down -v
docker rmi $(docker images | grep immune-me | awk '{print $3}')
docker-compose up -d --build

# For development mode
docker-compose -f docker-compose.dev.yml down -v
docker rmi $(docker images | grep immune-me | awk '{print $3}')
docker-compose -f docker-compose.dev.yml up -d --build
```

### Development Mode Specific Issues

#### Hot Reloading Not Working

If changes to your code are not being detected:

1. Verify that volume mounts are working correctly:
   ```bash
   docker-compose -f docker-compose.dev.yml exec backend ls -la
   docker-compose -f docker-compose.dev.yml exec frontend ls -la
   ```

2. Check for file watching errors in the logs:
   ```bash
   docker-compose -f docker-compose.dev.yml logs -f backend
   docker-compose -f docker-compose.dev.yml logs -f frontend
   ```

3. Try restarting the affected service:
   ```bash
   docker-compose -f docker-compose.dev.yml restart backend
   docker-compose -f docker-compose.dev.yml restart frontend
   ```

#### Expo Development Server Issues

If the Expo development server is not working correctly:

1. Check if the server is running:
   ```bash
   docker-compose -f docker-compose.dev.yml logs frontend | grep "Metro waiting"
   ```

2. Ensure all required ports are exposed:
   ```bash
   docker-compose -f docker-compose.dev.yml ps
   ```

3. Try clearing the Expo cache:
   ```bash
   docker-compose -f docker-compose.dev.yml exec frontend npx expo start --clear
   ```

4. If you're having trouble connecting from a mobile device, ensure your computer and device are on the same network.

#### "npx not found" Error in Frontend Container

If you encounter the following error when starting the frontend development container:

```
/docker-entrypoint.sh: exec: line 47: npx: not found
```

This occurs because the Node.js installation in the container is not properly configured or the PATH environment variable is not correctly set. To fix this issue:

1. **Option 1: Run the frontend locally** (recommended)
   - Follow the instructions in the "Running Frontend Locally" section above
   - This is the simplest solution and avoids Docker configuration issues

2. **Option 2: Update the docker-compose.dev.yml file**
   - Change the command to use npm instead of npx:
     ```yaml
     command: ["npm", "run", "web"]
     ```
   - Ensure the "web" script in frontend/package.json includes the "--host 0.0.0.0" parameter:
     ```json
     "web": "expo start --web --host 0.0.0.0"
     ```

3. **Option 3: Fix the PATH in the Dockerfile.dev**
   - Update the frontend/Dockerfile.dev to explicitly set the PATH:
     ```dockerfile
     ENV PATH="/usr/local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
     ```
   - Rebuild the frontend container:
     ```bash
     docker-compose -f docker-compose.dev.yml build frontend
     docker-compose -f docker-compose.dev.yml up -d
     ```

The root cause is typically related to how Node.js is installed in the Alpine Linux image and how the PATH environment variable is configured in the container.

#### Node Modules Issues

If you're experiencing dependency-related errors:

1. Rebuild node_modules inside the container:
   ```bash
   # For backend
   docker-compose -f docker-compose.dev.yml exec backend rm -rf node_modules
   docker-compose -f docker-compose.dev.yml exec backend npm ci
   
   # For frontend
   docker-compose -f docker-compose.dev.yml exec frontend rm -rf node_modules
   docker-compose -f docker-compose.dev.yml exec frontend npm ci
   ```

2. Restart the affected service:
   ```bash
   docker-compose -f docker-compose.dev.yml restart backend
   docker-compose -f docker-compose.dev.yml restart frontend
   ```

#### Database Migration Errors

If you encounter issues with database migrations:

1. Check the migration status:
   ```bash
   docker-compose -f docker-compose.dev.yml exec backend node ace migration:status
   ```

2. Try resetting the migrations (caution: this will delete all data):
   ```bash
   docker-compose -f docker-compose.dev.yml exec backend node ace migration:reset
   docker-compose -f docker-compose.dev.yml exec backend node ace migration:run
   ```

3. Check for syntax errors in your migration files:
   ```bash
   docker-compose -f docker-compose.dev.yml exec backend node ace migration:run --dry-run
   ```

#### Missing 'ts-node-maintained' Package Error

If you encounter the following error when starting the development containers:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'ts-node-maintained' imported from /app/ace.js
```

This occurs because the development dependencies are not being properly installed in the backend container. To fix this issue:

1. Ensure the `ts-node-maintained` package is listed in the `devDependencies` section of `backend/package.json`
2. Verify that the `npm ci` command in `backend/Dockerfile.dev` includes the `--include=dev` flag:
  ```dockerfile
  # Install all dependencies including dev dependencies
  RUN npm ci --include=dev
  ```
3. Rebuild the backend container:
  ```bash
  docker-compose -f docker-compose.dev.yml build backend
  docker-compose -f docker-compose.dev.yml up -d
  ```

This ensures that all development dependencies, including `ts-node-maintained`, are properly installed in the development container.

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [AdonisJS Documentation](https://docs.adonisjs.com/guides/introduction)
- [Expo Documentation](https://docs.expo.dev/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## Project Structure

```
immune-me/
├── .env                     # Environment variables
├── docker-compose.yml       # Docker Compose production configuration
├── docker-compose.dev.yml   # Docker Compose development configuration
├── backend/                 # AdonisJS backend application
│   ├── Dockerfile           # Backend production Docker configuration (multi-stage build)
│   ├── Dockerfile.dev       # Backend development Docker configuration (with hot reloading)
│   ├── app/                 # Application code
│   ├── config/              # Configuration files
│   ├── database/            # Database migrations and seeders
│   ├── start/               # Application entry points and routes
│   └── ...
├── frontend/                # React Native/Expo frontend application
│   ├── Dockerfile           # Frontend production Docker configuration (builds to Nginx)
│   ├── Dockerfile.dev       # Frontend development Docker configuration (Expo dev server)
│   ├── app/                 # Application code
│   ├── assets/              # Static assets (images, fonts)
│   └── ...
└── README.md                # This file
```

### Development-Specific Files

#### docker-compose.dev.yml
This file defines the development environment configuration:
- Sets up volume mounts for live code updates
- Configures the backend to run with hot reloading
- Runs the frontend with Expo development server
- Exposes additional ports for development tools

#### backend/Dockerfile.dev
A simplified Dockerfile for development that:
- Installs all dependencies including dev dependencies
- Sets up the environment for hot reloading
- Doesn't perform production optimizations

#### frontend/Dockerfile.dev
A development-focused Dockerfile that:
- Configures the Expo development server
- Exposes ports for Expo DevTools and web access
- Sets up environment for live code updates

## License

[Your License Information]