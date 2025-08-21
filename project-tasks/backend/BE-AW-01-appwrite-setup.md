# BE-AW-01: Initial Appwrite Project Setup and Configuration

## Title
Initial Appwrite Project Setup and Configuration

## Priority
High

## Estimated Time
4-6 hours

## Dependencies
None - This is the foundational task for the Appwrite migration

## Description
Set up a new Appwrite project and configure the basic infrastructure required for the Immune Me application. This includes creating the project, configuring authentication providers, setting up basic security rules, and preparing the development environment for the migration from the existing AdonisJS backend.

This task establishes the foundation for all subsequent Appwrite migration tasks and ensures proper project structure and configuration management.

## Acceptance Criteria
- [ ] Appwrite project created and configured
- [ ] Environment variables properly set up for development and production
- [ ] Basic authentication providers configured (email/password)
- [ ] Project settings optimized for healthcare data requirements
- [ ] CLI tools installed and configured
- [ ] Initial security rules and permissions framework established
- [ ] Project configuration documented and version controlled
- [ ] Connection to Appwrite project verified from development environment

## Technical Notes

### Appwrite Project Configuration
- **Project Name**: `immune-me-production` (production), `immune-me-dev` (development)
- **Region**: Select appropriate region based on deployment location
- **Database**: Configure for healthcare data with appropriate retention policies
- **Authentication**: Enable email/password, consider OAuth providers for future
- **Storage**: Configure file storage for patient documents and reports
- **Functions**: Enable cloud functions for business logic

### Environment Setup
```bash
# Install Appwrite CLI
npm install -g appwrite-cli

# Login to Appwrite
appwrite login

# Initialize project
appwrite init project
```

### Required Environment Variables
```env
# Appwrite Configuration
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-api-key

# Development
APPWRITE_DEV_PROJECT_ID=your-dev-project-id
APPWRITE_DEV_API_KEY=your-dev-api-key

# Security
APPWRITE_WEBHOOK_SECRET=your-webhook-secret
```

### Security Considerations
- Enable rate limiting for authentication endpoints
- Configure CORS policies for frontend domains
- Set up proper API key permissions and scopes
- Enable audit logging for compliance requirements
- Configure data encryption at rest and in transit

### Project Structure
```
appwrite-backend/
├── config/
│   ├── appwrite.json          # Main project configuration
│   ├── .env.example          # Environment template
│   └── security-rules.json   # Initial security rules
├── functions/                # Cloud functions directory
├── schemas/                  # Database schemas
└── utils/                   # Shared utilities
```

## Files to Create/Modify
- `appwrite-backend/config/appwrite.json` - Main Appwrite project configuration
- `appwrite-backend/config/.env.example` - Environment variables template
- `appwrite-backend/config/security-rules.json` - Initial security rules
- `appwrite-backend/config/README.md` - Configuration documentation
- `.gitignore` - Add Appwrite-specific ignore patterns
- `docker-compose.appwrite.yml` - Local Appwrite development setup (optional)

## Testing Requirements

### Configuration Validation
1. **Project Connection Test**
   ```bash
   appwrite health get
   ```

2. **Authentication Test**
   ```bash
   appwrite account get
   ```

3. **API Key Permissions Test**
   - Verify API key has required scopes
   - Test database read/write permissions
   - Validate function execution permissions

### Environment Verification
1. **Development Environment**
   - Verify connection to development project
   - Test environment variable loading
   - Validate CLI configuration

2. **Production Readiness**
   - Verify production project configuration
   - Test deployment pipeline integration
   - Validate security settings

### Security Testing
1. **CORS Configuration**
   - Test allowed origins
   - Verify blocked unauthorized domains

2. **Rate Limiting**
   - Test authentication rate limits
   - Verify API rate limiting

3. **API Key Security**
   - Verify key rotation capability
   - Test permission scopes

## Implementation Steps

### Phase 1: Project Creation
1. Create Appwrite account and organization
2. Set up development and production projects
3. Configure basic project settings
4. Generate and secure API keys

### Phase 2: Environment Configuration
1. Install and configure Appwrite CLI
2. Set up environment variables
3. Create configuration files
4. Test project connectivity

### Phase 3: Security Setup
1. Configure authentication providers
2. Set up initial security rules
3. Configure CORS and rate limiting
4. Enable audit logging

### Phase 4: Documentation and Testing
1. Document configuration process
2. Create environment setup guide
3. Test all configurations
4. Verify security settings

## Success Metrics
- Appwrite project accessible via CLI and web console
- All environment variables properly configured
- Authentication system functional
- Security rules properly applied
- Documentation complete and accurate
- Development team can connect to project

## Rollback Plan
- Keep existing AdonisJS backend running
- Document all Appwrite configuration changes
- Maintain separate development environment for testing
- Ensure ability to revert to previous state if needed

## Next Steps
After completion, this task enables:
- BE-AW-02: Database schema creation
- BE-AW-03: Authentication system migration
- All other backend migration tasks