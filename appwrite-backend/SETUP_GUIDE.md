# Appwrite Backend Setup Guide

This guide provides step-by-step instructions for setting up the Appwrite backend for the Immune Me healthcare application.

## Overview

The Appwrite setup includes:
- Development and production project configurations
- Healthcare-specific database schemas
- Role-based security rules
- Cloud functions for business logic
- File storage for patient documents
- Comprehensive monitoring and compliance features

## Prerequisites

Before starting, ensure you have:
- Node.js 18+ installed
- Git installed
- Access to Appwrite Cloud (https://cloud.appwrite.io) or self-hosted instance
- Admin access to create projects and API keys

## Step 1: Initial Setup

### 1.1 Install Appwrite CLI

The CLI is already installed globally. Verify the installation:

```bash
appwrite --version
```

### 1.2 Login to Appwrite

```bash
appwrite login
```

This will open a browser window for authentication.

### 1.3 Run Setup Script

```bash
cd appwrite-backend
./setup.sh
```

This script will:
- Verify prerequisites
- Create environment configuration
- Validate configuration files
- Provide next steps

## Step 2: Create Appwrite Projects

### 2.1 Development Project

```bash
appwrite projects create \
  --projectId="immune-me-dev" \
  --name="Immune Me - Development" \
  --teamId="your-team-id"
```

### 2.2 Production Project

```bash
appwrite projects create \
  --projectId="immune-me-production" \
  --name="Immune Me - Production" \
  --teamId="your-team-id"
```

## Step 3: Generate API Keys

### 3.1 Development API Key

```bash
appwrite projects createKey \
  --projectId="immune-me-dev" \
  --name="Development Server Key" \
  --scopes="users.read,users.write,databases.read,databases.write,functions.execute,storage.read,storage.write,teams.read,teams.write"
```

### 3.2 Production API Key

```bash
appwrite projects createKey \
  --projectId="immune-me-production" \
  --name="Production Server Key" \
  --scopes="users.read,users.write,databases.read,databases.write,functions.execute,storage.read,storage.write,teams.read,teams.write"
```

## Step 4: Configure Environment Variables

### 4.1 Edit Environment File

```bash
nano config/.env
```

Update the following variables with your actual values:

```bash
# Development Environment
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_DEV_PROJECT_ID=immune-me-dev
APPWRITE_DEV_API_KEY=your-dev-api-key-here

# Production Environment
APPWRITE_PROD_PROJECT_ID=immune-me-production
APPWRITE_PROD_API_KEY=your-prod-api-key-here

# Database Configuration
DATABASE_ID=main
DATABASE_NAME=ImmuneMeDatabase
```

### 4.2 Validate Configuration

```bash
./setup.sh test
```

## Step 5: Deploy Database Schema

### 5.1 Set Development Context

```bash
appwrite client \
  --endpoint="https://cloud.appwrite.io/v1" \
  --projectId="immune-me-dev" \
  --key="your-dev-api-key"
```

### 5.2 Initialize Project

```bash
appwrite init project
```

Select the existing project when prompted.

### 5.3 Deploy Collections

```bash
appwrite deploy collection --all
```

This will create:
- Patients collection
- Facilities collection
- Vaccines collection
- Immunization Records collection
- Notifications collection

### 5.4 Deploy Storage Buckets

```bash
appwrite deploy bucket --all
```

This will create:
- Patient Documents bucket
- Reports bucket

## Step 6: Configure Authentication

### 6.1 Enable Email/Password Provider

```bash
appwrite projects updateAuthStatus \
  --projectId="immune-me-dev" \
  --authEmailPassword=true
```

### 6.2 Configure Security Settings

```bash
# Set password policy
appwrite projects updateAuthPasswordHistory \
  --projectId="immune-me-dev" \
  --limit=5

# Enable password dictionary
appwrite projects updateAuthPasswordDictionary \
  --projectId="immune-me-dev" \
  --enabled=true

# Set session limits
appwrite projects updateAuthLimit \
  --projectId="immune-me-dev" \
  --limit=10
```

## Step 7: Set Up Teams and Roles

### 7.1 Create Teams

```bash
# Healthcare Workers Team
appwrite teams create \
  --teamId="healthcare-workers" \
  --name="Healthcare Workers"

# Administrators Team
appwrite teams create \
  --teamId="administrators" \
  --name="System Administrators"

# Facility Managers Team
appwrite teams create \
  --teamId="facility-managers" \
  --name="Facility Managers"
```

### 7.2 Configure Team Permissions

The security rules in `config/security-rules.json` define the permissions for each role. These are applied at the collection level during deployment.

## Step 8: Deploy Cloud Functions

### 8.1 Prepare Function Directories

```bash
# Create function package files
cd functions/notifications
npm init -y
npm install node-appwrite

cd ../reports
npm init -y
npm install node-appwrite

cd ../data-sync
npm init -y
npm install node-appwrite
```

### 8.2 Deploy Functions

```bash
cd ../../
appwrite deploy function --all
```

## Step 9: Configure CORS and Security

### 9.1 Set CORS Origins

```bash
appwrite projects updateAuthStatus \
  --projectId="immune-me-dev" \
  --authEmailPassword=true
```

### 9.2 Configure Rate Limits

Rate limiting is configured in the security rules and applied automatically.

## Step 10: Test the Setup

### 10.1 Health Check

```bash
appwrite health get
```

### 10.2 Test Database Access

```bash
appwrite databases list
```

### 10.3 Test Collections

```bash
appwrite databases listCollections --databaseId="main"
```

### 10.4 Test Storage

```bash
appwrite storage listBuckets
```

## Step 11: Production Deployment

### 11.1 Switch to Production

```bash
appwrite client \
  --endpoint="https://cloud.appwrite.io/v1" \
  --projectId="immune-me-production" \
  --key="your-prod-api-key"
```

### 11.2 Deploy Production Configuration

```bash
./setup.sh deploy-prod
```

### 11.3 Configure Production Security

- Enable audit logging
- Set up monitoring
- Configure backup policies
- Review and tighten security settings

## Step 12: Create Initial Users

### 12.1 Create Admin User

```bash
appwrite users create \
  --userId="admin-001" \
  --email="admin@immuneme.app" \
  --password="SecurePassword123!" \
  --name="System Administrator"
```

### 12.2 Assign Admin to Team

```bash
appwrite teams createMembership \
  --teamId="administrators" \
  --email="admin@immuneme.app" \
  --roles="admin" \
  --url="https://immuneme.app/join"
```

## Verification Checklist

After completing the setup, verify:

- [ ] Appwrite CLI installed and working
- [ ] Development project created and accessible
- [ ] Production project created and accessible
- [ ] API keys generated and configured
- [ ] Environment variables set correctly
- [ ] Database collections deployed
- [ ] Storage buckets created
- [ ] Authentication provider enabled
- [ ] Teams and roles configured
- [ ] Cloud functions deployed
- [ ] CORS and security settings applied
- [ ] Initial admin user created
- [ ] Health checks passing

## Troubleshooting

### Common Issues

1. **CLI Not Found**
   ```bash
   npm install -g appwrite-cli
   ```

2. **Permission Denied**
   - Check API key scopes
   - Verify team membership
   - Review project permissions

3. **Collection Deployment Fails**
   - Validate JSON syntax in appwrite.json
   - Check for duplicate collection IDs
   - Verify database exists

4. **Function Deployment Fails**
   - Check function directory structure
   - Verify package.json exists
   - Review function configuration

### Debug Commands

```bash
# Verbose output
appwrite --verbose health get

# Check project details
appwrite projects get

# List all collections
appwrite databases listCollections --databaseId="main"

# Check function status
appwrite functions list
```

## Next Steps

After successful setup:

1. **Frontend Integration**: Update frontend configuration with project IDs
2. **Data Migration**: Plan migration from existing AdonisJS backend
3. **Testing**: Implement comprehensive testing suite
4. **Monitoring**: Set up monitoring and alerting
5. **Documentation**: Update API documentation
6. **Training**: Train team on new backend system

## Support

For issues or questions:
- Review Appwrite documentation: https://appwrite.io/docs
- Check project GitHub issues
- Contact development team
- Appwrite Discord community: https://discord.gg/appwrite

---

**Important**: Keep API keys secure and never commit them to version control. Use environment variables for all sensitive configuration.