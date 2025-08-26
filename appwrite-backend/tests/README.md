# BE-AW-10 Enhanced Permission System Test Suite

This directory contains comprehensive tests for the enhanced permission system implemented in BE-AW-10. The test suite validates all acceptance criteria and ensures backward compatibility with existing utilities.

## Test Structure

```
tests/
├── fixtures/                          # Test data and fixtures
│   └── test-data.js                   # Comprehensive test data
├── mocks/                             # Mock implementations
│   ├── appwrite-mocks.js              # Appwrite SDK mocks
│   └── existing-utilities-mocks.js    # Legacy utility mocks
├── permissions/                       # Permission system tests
│   └── be-aw-10-collection-permissions.test.js  # Main test suite
├── validation/                        # Acceptance criteria validation
│   └── be-aw-10-acceptance-criteria.test.js     # AC validation
├── integration/                       # Integration tests
│   └── existing-utilities-integration.test.js   # Legacy integration
├── performance/                       # Performance tests
│   └── permission-performance.test.js # Performance benchmarks
└── README.md                          # This file
```

## Test Categories

### 1. Unit Tests (`permissions/be-aw-10-collection-permissions.test.js`)

**Purpose**: Test individual components of the permission system in isolation.

**Coverage**:
- Administrator role permissions
- Non-admin role restrictions
- Role-based permission validation
- Collection-level permission checking
- Document-level security enforcement
- Error handling and edge cases

**Key Test Scenarios**:
- ✅ Administrator users have full access to all collections
- ✅ Non-admin users are restricted from deleting
- ✅ Facility scoping for documents (users can only access their facility's data)
- ✅ Role-based permission validation for each role (administrator, supervisor, doctor, user)
- ✅ Collection-level permission checking
- ✅ Document-level security enforcement

### 2. Integration Tests (`integration/existing-utilities-integration.test.js`)

**Purpose**: Test integration with existing utilities and backward compatibility.

**Coverage**:
- TeamPermissionChecker integration
- FacilityTeamManager integration
- Backward compatibility with legacy functions
- Performance impact assessment
- Migration compatibility

**Key Test Scenarios**:
- ✅ Integration with existing team permission utilities
- ✅ Facility team management compatibility
- ✅ Legacy function signature support
- ✅ Performance benchmarking
- ✅ Gradual migration support

### 3. Acceptance Criteria Validation (`validation/be-aw-10-acceptance-criteria.test.js`)

**Purpose**: Validate implementation against all BE-AW-10 acceptance criteria.

**Coverage**:
- AC1: Collection Permissions
- AC2: Document Security
- AC3: Permission Validation
- AC4: Query Security
- AC5: System Integration
- AC6: Error Handling

**Acceptance Criteria Checklist**:

#### AC1: Collection Permissions
- [x] Each collection has appropriate role-based permissions
- [x] Facility-scoped collections enforce facility access
- [x] Administrator users have unrestricted access
- [x] Read-only reference data is properly configured

#### AC2: Document Security
- [x] Document-level permissions are applied for facility scoping
- [x] Users can only access documents from their assigned facility
- [x] Cross-facility access works for supervisors and administrators
- [x] Document creation automatically applies correct permissions

#### AC3: Permission Validation
- [x] Permission validation utilities work correctly
- [x] Role-based access is properly enforced
- [x] Facility-scoped access is validated
- [x] Permission checks are efficient and cached

#### AC4: Query Security
- [x] Facility-scoped queries automatically filter by facility
- [x] Cross-facility queries work for authorized users
- [x] Query performance is optimized
- [x] Security is maintained at query level

### 4. Performance Tests (`performance/permission-performance.test.js`)

**Purpose**: Ensure the permission system meets performance requirements.

**Coverage**:
- Permission checking performance with caching
- Query performance with security filters
- Configuration loading performance
- Concurrent permission checks
- Cache effectiveness

**Performance Benchmarks**:
- Permission checks: < 10ms average with caching
- Query building: < 5ms average
- Configuration loading: < 2 seconds
- Concurrent operations: 50+ simultaneous checks
- Cache hit ratio: > 80% for repeated operations

## Test Data

### Test Users
- **Administrator**: Full system access, no facility restrictions
- **Supervisor**: Facility-scoped management permissions
- **Doctor**: Medical treatment permissions within facility
- **User**: Read-only access within facility
- **Multi-role User**: User with multiple roles for edge case testing
- **Inactive User**: Disabled user for access denial testing

### Test Facilities
- **Central Hospital** (ID: 1): Primary test facility
- **Community Clinic** (ID: 2): Secondary test facility
- **Rural Health Center** (ID: 3): Additional facility for cross-facility testing

### Test Collections
- **patients**: Facility-scoped patient records
- **immunization_records**: Facility-scoped immunization data
- **facilities**: System-wide facility information
- **vaccines**: Reference data (read-only for non-admins)
- **vaccine_schedules**: Reference data
- **notifications**: User and facility-scoped notifications

## Running Tests

### Prerequisites
```bash
cd appwrite-backend/tests
npm install
```

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Acceptance criteria validation
npm run test:validation

# Performance tests
npm run test:performance

# Coverage report
npm run test:coverage
```

### Run Tests with Specific Patterns
```bash
# Run permission-related tests
npm test -- --testNamePattern="permission"

# Run administrator tests
npm test -- --testNamePattern="administrator"

# Run facility scoping tests
npm test -- --testNamePattern="facility"
```

### Debug Mode
```bash
npm run test:debug
```

## Test Configuration

### Jest Configuration
- **Environment**: Node.js
- **Test Timeout**: 10 seconds
- **Coverage Threshold**: 80% (branches, functions, lines, statements)
- **Mock Clearing**: Automatic between tests
- **Verbose Output**: Enabled

### Environment Variables
```bash
NODE_ENV=test
APPWRITE_ENDPOINT=https://test.appwrite.io/v1
APPWRITE_PROJECT_ID=test-project
APPWRITE_API_KEY=test-api-key
DATABASE_ID=test-db
```

## Mock Strategy

### Appwrite SDK Mocking
- **Client**: Mock connection and configuration
- **Databases**: Mock CRUD operations with realistic responses
- **Teams**: Mock team management operations
- **Users**: Mock user management operations
- **Permissions**: Mock permission helpers
- **Query**: Mock query building

### Legacy Utility Mocking
- **TeamPermissionChecker**: Simulates existing team permission logic
- **FacilityTeamManager**: Simulates facility team management
- **Configuration Manager**: Simulates existing configuration system

## Coverage Requirements

### Minimum Coverage Thresholds
- **Overall**: 80%
- **Permission Validator**: 90%
- **Document Security**: 90%
- **Facility Scoped Queries**: 85%
- **Configuration Loader**: 85%

### Coverage Reports
- **Text**: Console output during test runs
- **HTML**: `coverage/lcov-report/index.html`
- **LCOV**: `coverage/lcov.info`
- **JSON**: `coverage/coverage-final.json`

## Continuous Integration

### Test Pipeline
1. **Lint Tests**: ESLint validation of test files
2. **Unit Tests**: Individual component testing
3. **Integration Tests**: System integration validation
4. **Performance Tests**: Benchmark validation
5. **Coverage Validation**: Minimum threshold enforcement

### CI Configuration
```yaml
# Example GitHub Actions configuration
- name: Run Tests
  run: |
    cd appwrite-backend/tests
    npm ci
    npm run test:ci
    npm run validate:coverage
```

## Troubleshooting

### Common Issues

#### Test Timeouts
- **Cause**: Network simulation delays or complex permission calculations
- **Solution**: Increase test timeout or optimize mock responses

#### Mock Inconsistencies
- **Cause**: Mock data doesn't match real Appwrite responses
- **Solution**: Update mock responses based on actual API behavior

#### Cache-Related Test Failures
- **Cause**: Tests interfering with each other through shared cache
- **Solution**: Ensure proper cache clearing between tests

#### Permission Logic Errors
- **Cause**: Complex permission rules not properly implemented
- **Solution**: Review permission matrix and role hierarchy configuration

### Debug Strategies

#### Enable Verbose Logging
```javascript
// In test files
console.log = jest.fn(); // Comment out to enable logging
```

#### Inspect Mock Call Logs
```javascript
// Check what methods were called on mocks
const callLog = mockSDK.Databases().getCallLog();
console.log('Database calls:', callLog);
```

#### Test Individual Components
```bash
# Test specific components in isolation
npm test -- --testPathPattern="permission-validator"
```

## Contributing to Tests

### Adding New Tests

1. **Identify Test Category**: Unit, Integration, or Performance
2. **Create Test File**: Follow naming convention `*.test.js`
3. **Use Existing Fixtures**: Leverage `test-data.js` for consistency
4. **Mock External Dependencies**: Use provided mock utilities
5. **Follow Test Structure**: Describe blocks for logical grouping
6. **Add Documentation**: Update this README with new test information

### Test Writing Guidelines

1. **Descriptive Names**: Test names should clearly describe what is being tested
2. **Single Responsibility**: Each test should validate one specific behavior
3. **Arrange-Act-Assert**: Structure tests with clear setup, execution, and validation
4. **Mock Isolation**: Use mocks to isolate the system under test
5. **Error Testing**: Include both positive and negative test cases
6. **Performance Awareness**: Consider performance implications of test operations

### Code Review Checklist

- [ ] Tests cover all acceptance criteria
- [ ] Mock usage is appropriate and consistent
- [ ] Test names are descriptive and clear
- [ ] Error cases are properly tested
- [ ] Performance implications are considered
- [ ] Documentation is updated
- [ ] Coverage thresholds are met

## Maintenance

### Regular Maintenance Tasks

1. **Update Test Data**: Keep test fixtures current with schema changes
2. **Review Mock Accuracy**: Ensure mocks reflect actual API behavior
3. **Performance Monitoring**: Track test execution times and optimize slow tests
4. **Coverage Analysis**: Review coverage reports and add tests for uncovered code
5. **Dependency Updates**: Keep test dependencies current and secure

### Monitoring Test Health

- **Test Execution Time**: Monitor for performance degradation
- **Flaky Tests**: Identify and fix intermittently failing tests
- **Coverage Trends**: Track coverage changes over time
- **Mock Accuracy**: Validate mocks against real API changes

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Appwrite SDK Documentation](https://appwrite.io/docs)
- [BE-AW-10 Implementation Summary](../BE-AW-10-IMPLEMENTATION-SUMMARY.md)
- [Permission System Documentation](../utils/PERMISSION_SYSTEM_README.md)