# Configuration Files

This directory contains configuration files for Appwrite project setup, environment management, and deployment settings.

## Overview

Configuration files define the Appwrite project structure, environment variables, deployment settings, and integration configurations needed for the Immune Me application backend.

## Configuration Files

### Project Configuration
- `appwrite.json` - Main Appwrite project configuration file
- `project.json` - Project metadata and settings
- `environments.json` - Environment-specific configurations (dev, staging, prod)

### Service Configuration
- `database.json` - Database configuration and connection settings
- `storage.json` - File storage buckets and permissions
- `functions.json` - Cloud functions deployment configuration
- `auth.json` - Authentication providers and security settings

### Integration Configuration
- `webhooks.json` - Webhook endpoints and event subscriptions
- `smtp.json` - Email service configuration
- `sms.json` - SMS service provider settings
- `push-notifications.json` - Mobile push notification configuration

### Security Configuration
- `security-rules.json` - Global security rules and policies
- `api-keys.json` - API key configurations and scopes
- `cors.json` - Cross-Origin Resource Sharing settings
- `rate-limits.json` - API rate limiting configuration

## Environment Management

### Environment Variables
Common environment variables used across the Appwrite backend:

```bash
# Appwrite Core
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-api-key

# Database
DATABASE_ID=immune-me-db
DATABASE_NAME=ImmuneMeDatabase

# Authentication
AUTH_DURATION=86400
AUTH_LIMIT=10
JWT_EXPIRY=3600

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@domain.com
SMTP_PASSWORD=your-app-password
SMTP_SECURE=true

# SMS Configuration
SMS_PROVIDER=twilio
SMS_API_KEY=your-sms-api-key
SMS_FROM_NUMBER=+1234567890

# Push Notifications
FCM_SERVER_KEY=your-fcm-server-key
APNS_KEY_ID=your-apns-key-id
APNS_TEAM_ID=your-apns-team-id

# External Integrations
WEBHOOK_SECRET=your-webhook-secret
EXTERNAL_API_URL=https://api.external-system.com
EXTERNAL_API_KEY=your-external-api-key

# Monitoring and Logging
LOG_LEVEL=info
SENTRY_DSN=your-sentry-dsn
ANALYTICS_API_KEY=your-analytics-key
```

### Environment-Specific Settings

#### Development Environment
```json
{
  "environment": "development",
  "debug": true,
  "logLevel": "debug",
  "rateLimits": {
    "enabled": false
  },
  "cors": {
    "origins": ["http://localhost:3000", "http://localhost:8081"]
  }
}
```

#### Production Environment
```json
{
  "environment": "production",
  "debug": false,
  "logLevel": "error",
  "rateLimits": {
    "enabled": true,
    "requests": 1000,
    "duration": 3600
  },
  "cors": {
    "origins": ["https://immuneme.app"]
  }
}
```

## Appwrite Project Configuration

### Main Configuration (`appwrite.json`)
```json
{
  "projectId": "immune-me",
  "projectName": "Immune Me",
  "functions": [
    {
      "functionId": "notifications",
      "name": "Notification Functions",
      "runtime": "node-18.0",
      "path": "./functions/notifications",
      "entrypoint": "src/index.js"
    }
  ],
  "databases": [
    {
      "databaseId": "main",
      "name": "Main Database"
    }
  ],
  "collections": [
    {
      "databaseId": "main",
      "collectionId": "users",
      "name": "Users"
    }
  ],
  "buckets": [
    {
      "bucketId": "patient-documents",
      "name": "Patient Documents",
      "permissions": ["role:healthcare_worker"]
    }
  ]
}
```

### Authentication Configuration
```json
{
  "providers": {
    "email": {
      "enabled": true,
      "passwordMinLength": 8,
      "passwordHistory": 5
    },
    "phone": {
      "enabled": true,
      "provider": "twilio"
    },
    "oauth": {
      "google": {
        "enabled": false
      },
      "microsoft": {
        "enabled": false
      }
    }
  },
  "security": {
    "sessionLimit": 10,
    "passwordExpiry": 90,
    "mfaEnabled": true
  }
}
```

## Deployment Configuration

### CI/CD Pipeline Settings
```yaml
# .github/workflows/deploy.yml reference
environments:
  development:
    appwrite_endpoint: ${{ secrets.APPWRITE_ENDPOINT_DEV }}
    project_id: ${{ secrets.APPWRITE_PROJECT_ID_DEV }}
  
  production:
    appwrite_endpoint: ${{ secrets.APPWRITE_ENDPOINT_PROD }}
    project_id: ${{ secrets.APPWRITE_PROJECT_ID_PROD }}
```

### Function Deployment
```json
{
  "functions": {
    "notifications": {
      "runtime": "node-18.0",
      "timeout": 30,
      "memory": 512,
      "environment": {
        "NODE_ENV": "production",
        "LOG_LEVEL": "info"
      }
    },
    "reports": {
      "runtime": "node-18.0",
      "timeout": 60,
      "memory": 1024,
      "schedule": "0 6 * * *"
    }
  }
}
```

## Security Configuration

### API Key Scopes
```json
{
  "apiKeys": [
    {
      "name": "Server Key",
      "scopes": [
        "users.read",
        "users.write",
        "databases.read",
        "databases.write",
        "functions.execute"
      ]
    },
    {
      "name": "Read Only Key",
      "scopes": [
        "databases.read"
      ]
    }
  ]
}
```

### CORS Configuration
```json
{
  "cors": {
    "origins": [
      "https://immuneme.app",
      "https://admin.immuneme.app",
      "http://localhost:3000"
    ],
    "methods": ["GET", "POST", "PUT", "DELETE", "PATCH"],
    "headers": ["Content-Type", "Authorization", "X-Appwrite-Project"],
    "credentials": true
  }
}
```

## Best Practices

### Configuration Management
1. **Environment Separation**: Maintain separate configurations for each environment
2. **Secret Management**: Use environment variables for sensitive data
3. **Version Control**: Track configuration changes with proper versioning
4. **Documentation**: Document all configuration options and their purposes

### Security
1. **API Key Rotation**: Regularly rotate API keys and secrets
2. **Least Privilege**: Grant minimum required permissions
3. **Audit Logging**: Enable comprehensive audit logging
4. **Encryption**: Use HTTPS/TLS for all communications

### Deployment
1. **Automated Deployment**: Use CI/CD pipelines for consistent deployments
2. **Configuration Validation**: Validate configurations before deployment
3. **Rollback Strategy**: Maintain ability to rollback configuration changes
4. **Monitoring**: Monitor configuration changes and their impacts

## Troubleshooting

### Common Issues
- **Invalid Project ID**: Verify project ID matches Appwrite console
- **Permission Errors**: Check API key scopes and permissions
- **CORS Issues**: Verify origin URLs in CORS configuration
- **Function Timeouts**: Adjust timeout settings for long-running functions

### Debugging
- Enable debug logging in development environments
- Use Appwrite console for real-time monitoring
- Check function logs for execution details
- Validate JSON configuration syntax