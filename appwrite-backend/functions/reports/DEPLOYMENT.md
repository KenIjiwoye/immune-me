# Immunization Reporting Functions - Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the immunization reporting functions to Appwrite Cloud. These functions provide essential reporting and analytics capabilities for immunization tracking systems.

## Prerequisites

### Required Software
- Node.js 18.0 or higher
- Appwrite CLI 4.0 or higher
- Git
- Docker (for local testing)

### Appwrite Account Setup
1. Create an account at [Appwrite Cloud](https://cloud.appwrite.io)
2. Create a new project or use an existing one
3. Generate an API key with the following permissions:
   - `databases.read`
   - `databases.write`
   - `collections.read`
   - `collections.write`
   - `documents.read`
   - `documents.write`
   - `files.read`
   - `files.write`
   - `functions.read`
   - `functions.write`
   - `executions.write`

## Architecture Overview

### Functions List
1. **due-immunizations-list** - Lists patients with due immunizations
2. **vaccine-usage-statistics** - Provides vaccine usage analytics
3. **generate-pdf-report** - Creates PDF reports
4. **generate-excel-export** - Creates Excel exports
5. **generate-csv-export** - Creates CSV exports
6. **immunization-coverage-report** - Generates coverage reports
7. **age-distribution-analysis** - Analyzes age distribution
8. **facility-performance-metrics** - Tracks facility performance
9. **scheduled-weekly-reports** - Automated weekly reporting

### Data Collections
- **patients** - Patient demographic information
- **vaccines** - Vaccine catalog and schedules
- **immunization-records** - Individual immunization events
- **facilities** - Healthcare facility information

## Step-by-Step Deployment

### 1. Environment Setup

```bash
# Clone the repository
git clone <repository-url>
cd appwrite-backend/functions/reports

# Install dependencies for all functions
for dir in */; do
  if [ -f "$dir/package.json" ]; then
    echo "Installing dependencies for $dir"
    cd "$dir" && npm install && cd ..
  fi
done
```

### 2. Configure Environment Variables

Create `.env` files for each function based on the `.env.example` templates:

```bash
# Copy example files
find . -name ".env.example" -exec sh -c 'cp "$1" "${1%.example}"' _ {} \;

# Edit .env files with your actual values
# APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
# APPWRITE_PROJECT_ID=your-project-id
# APPWRITE_API_KEY=your-api-key
# DATABASE_ID=immunization-db
# BUCKET_ID=reports
```

### 3. Deploy Collections

Use the Appwrite CLI to create collections:

```bash
# Install Appwrite CLI
npm install -g appwrite-cli

# Login to Appwrite
appwrite login

# Create database
appwrite databases create --databaseId immunization-db --name "Immunization Database"

# Create collections (run each command)
appwrite databases createCollection --databaseId immunization-db --collectionId patients --name "Patients"
appwrite databases createCollection --databaseId immunization-db --collectionId vaccines --name "Vaccines"
appwrite databases createCollection --databaseId immunization-db --collectionId immunization-records --name "Immunization Records"
appwrite databases createCollection --databaseId immunization-db --collectionId facilities --name "Facilities"
```

### 4. Create Collection Attributes

Run the collection setup script:

```bash
node scripts/setup-collections.js
```

Or manually create attributes using the Appwrite CLI:

```bash
# Patients collection attributes
appwrite databases createStringAttribute --databaseId immunization-db --collectionId patients --key firstName --size 100 --required true
appwrite databases createStringAttribute --databaseId immunization-db --collectionId patients --key lastName --size 100 --required true
appwrite databases createDatetimeAttribute --databaseId immunization-db --collectionId patients --key dateOfBirth --required true
appwrite databases createEnumAttribute --databaseId immunization-db --collectionId patients --key gender --elements male,female,other --required true
# ... continue for all attributes

# Create indexes
appwrite databases createIndex --databaseId immunization-db --collectionId patients --key facilityId_idx --type key --attributes facilityId
```

### 5. Create Storage Bucket

```bash
# Create reports bucket
appwrite storage createBucket --bucketId reports --name "Reports" --maximumFileSize 10485760 --allowedFileExtensions pdf,xlsx,csv,json
```

### 6. Deploy Functions

#### Method 1: Using Appwrite CLI

```bash
# Deploy each function
for function_dir in */; do
  if [ -f "$function_dir/src/main.js" ]; then
    function_name=$(basename "$function_dir")
    echo "Deploying $function_name..."
    
    # Create function
    appwrite functions create \
      --functionId "$function_name" \
      --name "$(echo $function_name | tr '-' ' ' | sed 's/\b\(.\)/\u\1/g')" \
      --runtime node-18.0 \
      --entrypoint src/main.js
    
    # Deploy code
    cd "$function_dir"
    appwrite functions createDeployment \
      --functionId "$function_name" \
      --entrypoint src/main.js \
      --activate true
    cd ..
  fi
done
```

#### Method 2: Using Appwrite Console

1. Go to Appwrite Console → Functions
2. Click "Create Function"
3. Select "Node.js 18.0" runtime
4. Upload function code
5. Set entrypoint to `src/main.js`
6. Configure environment variables
7. Deploy and activate

### 7. Configure Function Variables

For each function, set the environment variables:

```bash
# Example for due-immunizations-list
appwrite functions update --functionId due-immunizations-list \
  --vars APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1 \
  --vars APPWRITE_PROJECT_ID=your-project-id \
  --vars APPWRITE_API_KEY=your-api-key \
  --vars DATABASE_ID=immunization-db \
  --vars PATIENTS_COLLECTION_ID=patients \
  --vars IMMUNIZATION_RECORDS_COLLECTION_ID=immunization-records \
  --vars VACCINES_COLLECTION_ID=vaccines
```

### 8. Configure Scheduled Functions

Set up cron schedules for automated functions:

```bash
# Due immunizations list - daily at 6 AM
appwrite functions update --functionId due-immunizations-list --schedule "0 6 * * *"

# Vaccine usage statistics - weekly on Monday at 7 AM
appwrite functions update --functionId vaccine-usage-statistics --schedule "0 7 * * 1"

# Weekly reports - weekly on Monday at 6 AM
appwrite functions update --functionId scheduled-weekly-reports --schedule "0 6 * * 1"
```

### 9. Test Deployment

Run the master test suite to validate all functions:

```bash
# Install test dependencies
npm install axios

# Run tests
node master-test-suite.js
```

## Environment-Specific Configurations

### Development Environment
```bash
# Use local Appwrite instance
export APPWRITE_ENDPOINT=http://localhost/v1
export APPWRITE_PROJECT_ID=dev-project-id
export APPWRITE_API_KEY=dev-api-key
```

### Staging Environment
```bash
# Use staging Appwrite instance
export APPWRITE_ENDPOINT=https://staging.appwrite.io/v1
export APPWRITE_PROJECT_ID=staging-project-id
export APPWRITE_API_KEY=staging-api-key
```

### Production Environment
```bash
# Use production Appwrite Cloud
export APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
export APPWRITE_PROJECT_ID=prod-project-id
export APPWRITE_API_KEY=prod-api-key
```

## Security Considerations

### API Key Permissions
Ensure API keys have minimal required permissions:
- Functions: Execute only
- Databases: Read-only for reporting functions
- Storage: Write for report generation

### Environment Variables
- Never commit `.env` files to version control
- Use Appwrite's built-in environment variable management
- Rotate API keys regularly

### Network Security
- Enable HTTPS/TLS for all endpoints
- Use Appwrite's built-in authentication
- Implement rate limiting on API endpoints

## Monitoring and Logging

### Function Monitoring
- Monitor execution times
- Track error rates
- Set up alerts for failures

### Log Analysis
- Use Appwrite's built-in logging
- Set up log aggregation for production
- Monitor for security events

## Troubleshooting

### Common Issues

#### Function Deployment Failures
```bash
# Check function logs
appwrite functions getExecution --functionId FUNCTION_ID --executionId EXECUTION_ID

# Update function configuration
appwrite functions update --functionId FUNCTION_ID --vars KEY=VALUE
```

#### Database Connection Issues
- Verify API key permissions
- Check collection IDs match configuration
- Ensure database exists and is accessible

#### Performance Issues
- Increase function memory allocation
- Optimize database queries
- Add caching where appropriate

### Debug Mode
Enable debug logging by setting:
```bash
export DEBUG=true
export LOG_LEVEL=debug
```

## Rollback Procedures

### Function Rollback
```bash
# List previous deployments
appwrite functions listDeployments --functionId FUNCTION_ID

# Rollback to previous version
appwrite functions updateDeployment --functionId FUNCTION_ID --deploymentId PREVIOUS_DEPLOYMENT_ID
```

### Database Rollback
- Use Appwrite's built-in backup features
- Export data before major changes
- Test rollback procedures regularly

## Support and Maintenance

### Regular Maintenance Tasks
- Update dependencies monthly
- Review and rotate API keys quarterly
- Monitor performance metrics
- Update documentation as needed

### Getting Help
- Check Appwrite documentation: https://appwrite.io/docs
- Review function logs in Appwrite Console
- Contact support for Appwrite Cloud issues

## Next Steps

After successful deployment:
1. Run the validation checklist
2. Set up monitoring alerts
3. Configure backup procedures
4. Train users on the new reporting features
5. Schedule regular maintenance windows