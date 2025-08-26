# Role Management System Test Suite

This directory contains comprehensive unit and integration tests for the role management system implemented in the Immune Me application backend.

## Overview

The test suite covers:
- **RoleManager Class**: Complete unit testing of all methods with edge cases and error handling
- **User Management Functions**: Integration tests for user creation and role assignment workflows
- **Permission Validation**: Security testing including privilege escalation prevention
- **Caching and Performance**: Testing of optimization features
- **Error Handling**: Comprehensive error scenario coverage

## Test Structure

```
tests/
├── role-manager.test.js              # Unit tests for RoleManager class
├── user-management/                  # Integration tests directory
│   ├── create-user.test.js          # User creation workflow tests
│   ├── assign-role.test.js          # Role assignment workflow tests
│   └── permission-validation.test.js # Permission and security tests
├── jest.config.js                   # Jest configuration
├── setup.js                         # Test setup and utilities
├── package.json                     # Test dependencies and scripts
└── README.md                        # This file
```

## Test Categories

### 1. Unit Tests (`role-manager.test.js`)

Tests all RoleManager methods:
- `hasRole()` - Role checking functionality
- `hasAnyRole()` - Multiple role validation
- `getFacilityId()` - Facility ID extraction
- `isAdministrator()` - Administrator role checking
- `canAccessMultipleFacilities()` - Multi-facility access validation
- `getUserRoleInfo()` - Complete user role information retrieval
- `assignRole()` - Role assignment functionality
- `removeRole()` - Role removal functionality
- `hasPermission()` - Permission checking
- `validateFacilityAccess()` - Facility access validation

**Coverage Areas:**
- ✅ Happy path scenarios
- ✅ Edge cases and error conditions
- ✅ Input validation
- ✅ Caching functionality
- ✅ Performance optimizations
- ✅ Concurrent access handling

### 2. Integration Tests (`user-management/`)

#### Create User Tests (`create-user.test.js`)
- User creation with role assignment
- Input validation and error handling
- Role assignment integration
- Cleanup on failure scenarios
- Environment configuration

#### Assign Role Tests (`assign-role.test.js`)
- Role modification workflows
- Permission validation for role assignment
- Privilege escalation prevention
- Cross-facility role assignment restrictions
- Security feature testing

#### Permission Validation Tests (`permission-validation.test.js`)
- Comprehensive permission checking
- Role hierarchy validation
- Facility access control
- Multi-facility access validation
- Security edge cases
- Audit and compliance features

## Security Testing

The test suite includes comprehensive security testing:

### Privilege Escalation Prevention
- Users cannot assign roles higher than their own
- Role hierarchy is properly enforced
- Cross-facility restrictions are validated

### Permission Validation
- Each role's permissions are thoroughly tested
- Resource-level access control is validated
- Operation-level permissions are verified

### Facility Access Control
- Administrators can access all facilities
- Non-administrators are restricted to their assigned facility
- Facility ID validation and manipulation prevention

## Running Tests

### Prerequisites

```bash
cd appwrite-backend/tests
npm install
```

### Test Commands

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test suites
npm run test:role-manager      # Unit tests only
npm run test:user-management   # Integration tests only
npm run test:integration       # All integration tests
npm run test:unit             # All unit tests

# Run security-focused tests
npm run test:security

# Run performance tests
npm run test:performance

# Run tests for CI/CD
npm run test:ci

# Debug tests
npm run test:debug
```

### Coverage Reports

Coverage reports are generated in the `coverage/` directory:
- `coverage/lcov-report/index.html` - HTML coverage report
- `coverage/lcov.info` - LCOV format for CI integration
- `coverage/coverage-final.json` - JSON coverage data

### Coverage Thresholds

The test suite enforces minimum coverage thresholds:
- **Global**: 80% (branches, functions, lines, statements)
- **RoleManager**: 90% (branches, functions, lines, statements)
- **User Management Functions**: 85% (branches, functions, lines, statements)

## Test Data and Utilities

### Global Test Utilities (`setup.js`)

The setup file provides:
- Mock object creators (`createMockUser`, `createMockRequest`, etc.)
- Test data generators (`createRoleTestData`, `randomEmail`, etc.)
- Custom Jest matchers (`toBeValidUserId`, `toHaveSuccessStructure`, etc.)
- Response validation utilities
- Error handling helpers

### Mock Data

Test users with different roles:
```javascript
const testData = testUtils.createRoleTestData();
// Returns: { administrator, supervisor, doctor, user }
```

### Custom Matchers

```javascript
// Validate user IDs
expect(userId).toBeValidUserId();

// Validate roles
expect(role).toBeValidRole();

// Validate response structure
expect(response).toHaveSuccessStructure(true);

// Validate permissions structure
expect(permissions).toHaveValidPermissionsStructure();
```

## Test Cases from BE-AW-08 Ticket

The test suite implements all test cases specified in the BE-AW-08 ticket:

### Core Functionality Tests
- ✅ Role assignment and validation
- ✅ Permission checking for different roles
- ✅ Facility-based access control
- ✅ Multi-facility access for administrators

### Security Tests
- ✅ Privilege escalation prevention
- ✅ Cross-facility access restrictions
- ✅ Invalid role assignment attempts
- ✅ Malicious input handling

### Performance Tests
- ✅ Caching functionality
- ✅ Concurrent request handling
- ✅ Cache invalidation on role changes
- ✅ Performance optimization validation

### Error Handling Tests
- ✅ Network timeout handling
- ✅ Appwrite API error handling
- ✅ Invalid input validation
- ✅ User not found scenarios
- ✅ Role assignment failures

## Continuous Integration

### GitHub Actions Integration

```yaml
- name: Run Role Management Tests
  run: |
    cd appwrite-backend/tests
    npm ci
    npm run test:ci
```

### Coverage Integration

The test suite generates coverage reports in multiple formats for CI integration:
- LCOV for SonarQube/CodeCov
- JUnit XML for test result reporting
- JSON for custom integrations

## Debugging Tests

### Debug Mode
```bash
npm run test:debug
```

This starts Jest with Node.js debugging enabled. You can then:
1. Open Chrome DevTools
2. Navigate to `chrome://inspect`
3. Click "Open dedicated DevTools for Node"

### Verbose Output
All tests run with verbose output enabled, showing:
- Individual test results
- Test execution time
- Coverage information
- Mock call information

## Best Practices

### Test Organization
- Tests are organized by functionality
- Each test file focuses on a specific component
- Test descriptions are clear and descriptive
- Setup and teardown are properly handled

### Mock Usage
- All external dependencies are mocked
- Mocks are reset between tests
- Mock implementations are realistic
- Mock data is consistent and valid

### Assertions
- Tests use specific, meaningful assertions
- Error cases are thoroughly tested
- Edge cases are covered
- Performance characteristics are validated

### Maintenance
- Tests are kept up-to-date with code changes
- Coverage thresholds are maintained
- Test data is regularly reviewed
- Documentation is kept current

## Troubleshooting

### Common Issues

1. **Tests failing due to missing environment variables**
   - Ensure all required environment variables are set in `setup.js`

2. **Coverage thresholds not met**
   - Run `npm run test:coverage` to see detailed coverage report
   - Add tests for uncovered code paths

3. **Mock-related errors**
   - Ensure mocks are properly reset between tests
   - Check mock implementations match expected interfaces

4. **Timeout errors**
   - Increase test timeout in Jest configuration
   - Check for unresolved promises in tests

### Getting Help

For issues with the test suite:
1. Check the test output for specific error messages
2. Review the coverage report for missing test cases
3. Consult the Jest documentation for configuration issues
4. Review the role management implementation for API changes

## Contributing

When adding new tests:
1. Follow the existing test structure and naming conventions
2. Include both positive and negative test cases
3. Add appropriate mocks and test data
4. Update coverage thresholds if necessary
5. Document any new test utilities or patterns