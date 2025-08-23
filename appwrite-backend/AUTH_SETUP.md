# Appwrite Authentication System Setup Guide

This guide provides complete instructions for setting up the Appwrite authentication system for the healthcare immunization management platform.

## Overview

The authentication system has been migrated from AdonisJS to Appwrite Auth, providing:
- ✅ Email/password authentication
- ✅ Role-based access control (RBAC)
- ✅ Session management
- ✅ Password policies
- ✅ Multi-factor authentication (MFA)
- ✅ User migration utilities
- ✅ Comprehensive testing

## Architecture

### User Roles
- **Admin**: Full system access
- **Healthcare Worker**: Patient and immunization management
- **Facility Manager**: Facility-specific administration and reporting

### Teams Structure
- `admin-team`: System administrators
- `healthcare-workers`: Healthcare professionals
- `facility-managers`: Facility administrators

## Quick Start

### 1. Environment Setup

Create `.env` file in `appwrite-backend/`:

```bash
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key
FRONTEND_URL=http://localhost:8081
```

### 2. Install Dependencies

```bash
cd appwrite-backend
npm install
```

### 3. Run Complete Setup

```bash
node scripts/setup-auth.js setup
```

This will:
- ✅ Validate environment configuration
- ✅ Create teams for each role
- ✅ Configure MFA for admin users
- ✅ Run comprehensive tests
- ✅ Create test users

### 4. Test Users (Created Automatically)

| Email | Password | Role |
|-------|----------|------|
| admin@healthcare.local | AdminPass123! | admin |
| healthcare@healthcare.local | HealthcarePass123! | healthcare_worker |
| manager@healthcare.local | ManagerPass123! | facility_manager |

## Manual Setup Commands

### Teams Setup
```bash
npm run setup-teams
```

### MFA Configuration
```bash
node config/mfa-setup.js setup <userId> [totp|email]
```

### User Migration
```bash
node utils/user-migration.js
```

### Testing
```bash
npm run test-auth
npm run test-password
npm run test-permissions
npm run test-teams
```

## API Integration

### Authentication Middleware

```javascript
const AuthMiddleware = require('./utils/auth-middleware');
const auth = new AuthMiddleware();

// Protect routes
app.use('/api/protected', auth.requireAuth);

// Role-based access
app.get('/api/admin/users', 
  auth.requireAuth, 
  auth.requireRole(['admin']), 
  getUsersHandler
);

// Permission-based access
app.post('/api/patients', 
  auth.requireAuth, 
  auth.requirePermissions(['patients.create']), 
  createPatientHandler
);
```

### Session Management

```javascript
const SessionManager = require('./utils/session-manager');
const sessionManager = new SessionManager();

// Create session
const session = await sessionManager.createSession(email, password);

// Validate session
const isValid = await sessionManager.isSessionValid(sessionId);

// Get session info
const sessionInfo = await sessionManager.getSession(sessionId);
```

### Password Policy

```javascript
const PasswordPolicy = require('./utils/password-policy');
const policy = new PasswordPolicy();

// Validate password
const result = policy.validate(password, userInfo);
if (!result.isValid) {
  return res.status(400).json({ errors: result.errors });
}
```

### Permissions Checking

```javascript
const Permissions = require('./utils/permissions');
const permissions = new Permissions();

// Check single permission
const result = await permissions.checkPermission(userId, 'patients.read');

// Check multiple permissions
const result = await permissions.checkPermissions(userId, ['patients.read', 'patients.write']);
```

## User Migration

### From AdonisJS to Appwrite

1. **Export existing users** from AdonisJS database
2. **Run migration script**:
   ```bash
   node utils/user-migration.js
   ```
3. **Generate password reset tokens** for migrated users
4. **Send password reset emails** to users

### Migration Script Usage

```javascript
const UserMigration = require('./utils/user-migration');
const migration = new UserMigration();

// Create teams first
await migration.createTeams();

// Migrate users
const results = await migration.migrateUsers(existingUsers);

// Generate password reset tokens
const tokens = await migration.generatePasswordResetTokens(existingUsers);
```

## Multi-Factor Authentication (MFA)

### Setup for Admin Users

```bash
node config/mfa-setup.js setup <userId> totp
```

### Enable MFA for Role

```javascript
const MFASetup = require('./config/mfa-setup');
const mfa = new MFASetup();

// Enable MFA for admin role
await mfa.setupMFAForRole('admin');

// Enable MFA for specific user
await mfa.enableMFAForUser(userId, true);
```

## Security Features

### Password Policy
- Minimum 8 characters
- Must contain uppercase, lowercase, numbers, and symbols
- No personal information
- Password history (5 previous passwords)
- Common password blacklist

### Session Management
- 24-hour session duration
- 1-hour inactivity timeout
- Maximum 5 concurrent sessions
- Session alerts before expiry

### MFA Configuration
- TOTP (Google Authenticator, Authy)
- Email-based MFA
- Required for admin users
- Recovery codes available

## Testing

### Run All Tests
```bash
node tests/auth-tests.js
```

### Individual Test Suites
```bash
# Teams setup
node tests/auth-tests.js teams

# Password policy
node tests/auth-tests.js password

# Permissions
node tests/auth-tests.js permissions
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `APPWRITE_ENDPOINT` | Appwrite API endpoint | `https://cloud.appwrite.io/v1` |
| `APPWRITE_PROJECT_ID` | Your Appwrite project ID | `your_project_id` |
| `APPWRITE_API_KEY` | API key with appropriate permissions | `your_api_key` |
| `FRONTEND_URL` | Frontend URL for email verification | `http://localhost:8081` |

## Troubleshooting

### Common Issues

1. **"Missing environment variables"**
   - Check `.env` file exists and contains all required variables

2. **"Team creation failed"**
   - Ensure API key has team management permissions

3. **"User creation failed"**
   - Check if user already exists (409 error)
   - Verify email format and uniqueness

4. **"MFA setup failed"**
   - Ensure MFA is enabled in Appwrite project settings
   - Check user has email address configured

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=appwrite:auth npm run test-auth
```

## Integration Checklist

- [ ] Environment variables configured
- [ ] Teams created successfully
- [ ] Test users created and accessible
- [ ] Password policy enforced
- [ ] Session management working
- [ ] MFA configured for admin users
- [ ] Permissions system validated
- [ ] Frontend integration completed
- [ ] User migration tested
- [ ] Security audit performed

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Appwrite documentation
3. Run test suites to identify specific problems
4. Check environment configuration
5. Verify API key permissions