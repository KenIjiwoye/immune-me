# Appwrite Configuration Guide

This directory contains all configuration files for the Immune Me Appwrite backend setup. This guide provides comprehensive instructions for setting up, configuring, and managing the Appwrite infrastructure.

## Overview

The Appwrite backend configuration includes:
- Project structure and database schemas
- Authentication and security rules
- Environment variables and deployment settings
- Healthcare-specific compliance configurations

## Quick Start

### 1. Prerequisites

- Node.js 18+ installed
- Appwrite CLI installed globally: `npm install -g appwrite-cli`
- Appwrite Cloud account or self-hosted instance
- Access to development and production environments

### 2. Initial Setup

```bash
# Clone the repository and navigate to the project
cd immune-me/appwrite-backend

# Copy environment template
cp config/.env.example config/.env

# Edit environment variables
nano config/.env
```

### 3. Configure Environment Variables

Edit `config/.env` with your actual values:

```bash
# Required: Appwrite project details
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your-actual-project-id
APPWRITE_API_KEY=your-actual-api-key

# Required: Database configuration
DATABASE_ID=main
```

## Configuration Files

### [`appwrite.json`](appwrite.json)

Main project configuration file defining:
- **Project Settings**: Basic project metadata and service configurations
- **Authentication**: Email/password provider with security settings
- **Database Collections**: Complete schema for all healthcare entities
- **Storage Buckets**: File storage for patient documents and reports
- **Cloud Functions**: Serverless functions for business logic
- **Teams**: Role-based access control groups

**Key Collections:**
- `patients` - Patient demographic and medical information
- `facilities` - Healthcare facility data
- `vaccines` - Vaccine definitions and metadata
- `immunization_records` - Individual immunization events
- `notifications` - System notifications and alerts

### [`.env.example`](.env.example)

Environment variables template with:
- **Core Settings**: Appwrite endpoint, project ID, API keys
- **Authentication**: Session management and security policies
- **Email/SMS**: Communication service configurations
- **Healthcare Compliance**: HIPAA and data protection settings
- **Monitoring**: Logging and analytics configurations

### [`security-rules.json`](security-rules.json)

Comprehensive security framework including:
- **Role Definitions**: Admin, healthcare worker, facility manager roles
- **Collection Permissions**: Fine-grained access control per collection
- **Document Security**: Row-level security for sensitive data
- **Storage Security**: File access and encryption requirements
- **Compliance Settings**: HIPAA and GDPR compliance configurations

## Environment Setup

### Development Environment

1. **Create Development Project**
   ```bash
   # Login to Appwrite
   appwrite login
   
   # Create development project
   appwrite projects create --projectId=immune-me-dev --name="Immune Me - Development"
   ```

2. **Configure Development Settings**
   ```bash
   # Set project context
   appwrite client --endpoint=https://cloud.appwrite.io/v1 --projectId=immune-me-dev
   
   # Generate API key
   appwrite projects createKey --name="Development Key" --scopes=users.read,users.write,databases.read,databases.write,functions.execute,storage.read,storage.write
   ```

3. **Deploy Configuration**
   ```bash
   # Deploy database collections
   appwrite deploy collection
   
   # Deploy storage buckets
   appwrite deploy bucket
   
   # Deploy functions
   appwrite deploy function
   ```

### Production Environment

1. **Create Production Project**
   ```bash
   # Create production project
   appwrite projects create --projectId=immune-me-production --name="Immune Me - Production"
   ```

2. **Configure Production Security**
   - Enable rate limiting
   - Configure CORS for production domains
   - Set up audit logging
   - Enable data encryption
   - Configure backup policies

3. **Deploy to Production**
   ```bash
   # Switch to production context
   appwrite client --endpoint=https://cloud.appwrite.io/v1 --projectId=immune-me-production
   
   # Deploy with production settings
   appwrite deploy
   ```

## Security Configuration

### Role-Based Access Control

The system implements four primary roles:

1. **Admin** (`role:admin`)
   - Full system access
   - User management
   - System configuration
   - Data export/import

2. **Healthcare Worker** (`role:healthcare_worker`)
   - Patient data access
   - Immunization record management
   - Document upload/download
   - Facility-specific data access

3. **Facility Manager** (`role:facility_manager`)
   - Facility management
   - Staff oversight
   - Reporting access
   - Notification management

4. **Read Only** (`role:read_only`)
   - Analytics and reporting
   - Data visualization
   - No write permissions

### Data Isolation

Healthcare data is isolated by facility:
- Patients are linked to specific facilities
- Healthcare workers can only access their facility's data
- Cross-facility access requires admin privileges
- Audit trails track all data access

### Compliance Features

**HIPAA Compliance:**
- Data encryption at rest and in transit
- Access logging and audit trails
- User authentication and authorization
- Data backup and recovery procedures
- Business associate agreements support

**GDPR Compliance:**
- Consent management
- Right to erasure (data deletion)
- Data portability
- Privacy by design
- Data minimization

## Authentication Setup

### Email/Password Provider

Configured with healthcare-grade security:
- Minimum 8-character passwords
- Password complexity requirements
- Account lockout after failed attempts
- Session management and timeout
- Password history tracking

### Configuration Steps

1. **Enable Email Provider**
   ```bash
   appwrite projects updateAuthStatus --authEmailPassword=true
   ```

2. **Configure Security Settings**
   ```bash
   # Set password policy
   appwrite projects updateAuthPasswordHistory --limit=5
   appwrite projects updateAuthPasswordDictionary --enabled=true
   
   # Configure session limits
   appwrite projects updateAuthLimit --limit=10
   ```

3. **Set Up Email Templates**
   - Welcome email for new users
   - Password reset instructions
   - Account verification
   - Security notifications

## Database Schema

### Core Collections

**Patients Collection:**
- Unique patient identifiers
- Demographic information
- Medical history
- Guardian information
- Facility association

**Immunization Records Collection:**
- Vaccination events
- Vaccine batch tracking
- Healthcare provider information
- Adverse reaction monitoring
- Audit trail maintenance

**Facilities Collection:**
- Healthcare facility information
- Location and contact details
- Facility type classification
- Active status tracking

### Relationships

- Patients → Facilities (many-to-one)
- Patients → Immunization Records (one-to-many)
- Vaccines → Immunization Records (one-to-many)
- Users → Facilities (many-to-many through teams)

## Storage Configuration

### Patient Documents Bucket

- **Purpose**: Store patient-related documents
- **Security**: Role-based access, encryption enabled
- **File Types**: PDF, images, Word documents
- **Size Limit**: 10MB per file
- **Antivirus**: Enabled for security

### Reports Bucket

- **Purpose**: Generated reports and analytics
- **Security**: Read access for authorized roles
- **File Types**: PDF, Excel, CSV
- **Size Limit**: 50MB per file
- **Retention**: Configurable based on compliance needs

## Cloud Functions

### Notification Functions

- **Trigger**: New immunization records, patient registrations
- **Purpose**: Send automated notifications
- **Runtime**: Node.js 18
- **Timeout**: 30 seconds

### Report Generation

- **Schedule**: Daily at 6 AM
- **Purpose**: Generate compliance and analytics reports
- **Runtime**: Node.js 18
- **Timeout**: 5 minutes

### Data Synchronization

- **Trigger**: Manual or scheduled
- **Purpose**: Sync with external systems
- **Runtime**: Node.js 18
- **Timeout**: 10 minutes

## Monitoring and Logging

### Audit Logging

All critical operations are logged:
- User authentication events
- Data access and modifications
- Administrative actions
- System errors and exceptions

### Performance Monitoring

- Function execution times
- Database query performance
- Storage usage metrics
- API response times

### Health Checks

Regular health checks monitor:
- Database connectivity
- Function availability
- Storage accessibility
- External service integrations

## Backup and Recovery

### Automated Backups

- **Frequency**: Daily incremental, weekly full
- **Retention**: 30 days for compliance
- **Storage**: Encrypted cloud storage
- **Testing**: Monthly restore tests

### Disaster Recovery

- **RTO**: 4 hours (Recovery Time Objective)
- **RPO**: 1 hour (Recovery Point Objective)
- **Procedures**: Documented step-by-step recovery
- **Testing**: Quarterly disaster recovery drills

## Deployment

### Development Deployment

```bash
# Deploy to development
appwrite client --endpoint=https://cloud.appwrite.io/v1 --projectId=immune-me-dev
appwrite deploy
```

### Production Deployment

```bash
# Deploy to production
appwrite client --endpoint=https://cloud.appwrite.io/v1 --projectId=immune-me-production
appwrite deploy --force
```

### CI/CD Integration

GitHub Actions workflow for automated deployment:
- Automated testing
- Security scanning
- Configuration validation
- Staged deployment

## Troubleshooting

### Common Issues

1. **Connection Errors**
   - Verify endpoint URL
   - Check API key permissions
   - Validate network connectivity

2. **Permission Denied**
   - Review role assignments
   - Check collection permissions
   - Verify API key scopes

3. **Function Timeouts**
   - Increase timeout settings
   - Optimize function code
   - Check external dependencies

### Debug Commands

```bash
# Check project status
appwrite projects get

# List collections
appwrite databases listCollections --databaseId=main

# Test function
appwrite functions createExecution --functionId=notifications

# Check logs
appwrite projects listLogs
```

## Support and Maintenance

### Regular Maintenance Tasks

- **Weekly**: Review audit logs, check system health
- **Monthly**: Update dependencies, security patches
- **Quarterly**: Disaster recovery testing, performance review
- **Annually**: Security audit, compliance review

### Getting Help

- **Documentation**: [Appwrite Docs](https://appwrite.io/docs)
- **Community**: [Discord](https://discord.gg/appwrite)
- **Issues**: GitHub repository issues
- **Support**: Enterprise support for production systems

## Migration from AdonisJS

### Data Migration Strategy

1. **Assessment Phase**
   - Analyze existing PostgreSQL schema
   - Map relationships to document structure
   - Identify data transformation needs

2. **Migration Scripts**
   - Export data from PostgreSQL
   - Transform to Appwrite document format
   - Import with validation

3. **Validation Phase**
   - Data integrity checks
   - Performance testing
   - User acceptance testing

### Parallel Operation

- Run both systems during transition
- Gradual feature migration
- Rollback capability maintained
- User training and support

## Best Practices

### Security

- Regular API key rotation
- Principle of least privilege
- Regular security audits
- Incident response procedures

### Performance

- Optimize database queries
- Use appropriate indexes
- Monitor function performance
- Cache frequently accessed data

### Compliance

- Regular compliance audits
- Staff training on data handling
- Documentation maintenance
- Incident reporting procedures

---

For additional support or questions, please refer to the project documentation or contact the development team.