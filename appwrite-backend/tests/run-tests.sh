#!/bin/bash

# Role Management System Test Runner
# Comprehensive test execution script for the role management system

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if npm is installed
check_npm() {
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install Node.js and npm first."
        exit 1
    fi
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing test dependencies..."
    if npm ci; then
        print_success "Dependencies installed successfully"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
}

# Function to run linting
run_lint() {
    print_status "Running ESLint on test files..."
    if npm run lint:tests; then
        print_success "Linting passed"
    else
        print_warning "Linting issues found (non-blocking)"
    fi
}

# Function to run unit tests
run_unit_tests() {
    print_status "Running unit tests (RoleManager)..."
    if npm run test:unit; then
        print_success "Unit tests passed"
        return 0
    else
        print_error "Unit tests failed"
        return 1
    fi
}

# Function to run integration tests
run_integration_tests() {
    print_status "Running integration tests (User Management)..."
    if npm run test:integration; then
        print_success "Integration tests passed"
        return 0
    else
        print_error "Integration tests failed"
        return 1
    fi
}

# Function to run security tests
run_security_tests() {
    print_status "Running security-focused tests..."
    if npm run test:security; then
        print_success "Security tests passed"
        return 0
    else
        print_error "Security tests failed"
        return 1
    fi
}

# Function to run performance tests
run_performance_tests() {
    print_status "Running performance tests..."
    if npm run test:performance; then
        print_success "Performance tests passed"
        return 0
    else
        print_error "Performance tests failed"
        return 1
    fi
}

# Function to run all tests with coverage
run_full_test_suite() {
    print_status "Running complete test suite with coverage..."
    if npm run test:coverage; then
        print_success "Full test suite passed with coverage"
        return 0
    else
        print_error "Full test suite failed"
        return 1
    fi
}

# Function to validate coverage thresholds
validate_coverage() {
    print_status "Validating coverage thresholds..."
    if npm run validate:coverage; then
        print_success "Coverage thresholds met"
        return 0
    else
        print_error "Coverage thresholds not met"
        return 1
    fi
}

# Function to generate coverage report
generate_coverage_report() {
    print_status "Generating coverage report..."
    if [ -d "coverage" ]; then
        print_success "Coverage report available at: coverage/lcov-report/index.html"
        if command -v open &> /dev/null; then
            print_status "Opening coverage report in browser..."
            open coverage/lcov-report/index.html
        elif command -v xdg-open &> /dev/null; then
            print_status "Opening coverage report in browser..."
            xdg-open coverage/lcov-report/index.html
        fi
    else
        print_warning "Coverage report not found"
    fi
}

# Function to display test summary
display_summary() {
    echo ""
    echo "=================================="
    echo "    TEST EXECUTION SUMMARY"
    echo "=================================="
    echo ""
    
    if [ $UNIT_TESTS_PASSED -eq 1 ]; then
        print_success "✓ Unit Tests (RoleManager)"
    else
        print_error "✗ Unit Tests (RoleManager)"
    fi
    
    if [ $INTEGRATION_TESTS_PASSED -eq 1 ]; then
        print_success "✓ Integration Tests (User Management)"
    else
        print_error "✗ Integration Tests (User Management)"
    fi
    
    if [ $SECURITY_TESTS_PASSED -eq 1 ]; then
        print_success "✓ Security Tests"
    else
        print_error "✗ Security Tests"
    fi
    
    if [ $PERFORMANCE_TESTS_PASSED -eq 1 ]; then
        print_success "✓ Performance Tests"
    else
        print_error "✗ Performance Tests"
    fi
    
    if [ $COVERAGE_VALID -eq 1 ]; then
        print_success "✓ Coverage Thresholds Met"
    else
        print_error "✗ Coverage Thresholds Not Met"
    fi
    
    echo ""
    
    if [ $ALL_TESTS_PASSED -eq 1 ]; then
        print_success "🎉 ALL TESTS PASSED! Role management system is ready for deployment."
        echo ""
        echo "Test Coverage:"
        echo "- RoleManager Class: Comprehensive unit testing"
        echo "- User Management Functions: Integration testing"
        echo "- Security Features: Privilege escalation prevention"
        echo "- Performance: Caching and optimization validation"
        echo "- Error Handling: Comprehensive error scenarios"
        echo ""
        return 0
    else
        print_error "❌ SOME TESTS FAILED! Please review the output above."
        echo ""
        echo "Failed Components:"
        [ $UNIT_TESTS_PASSED -eq 0 ] && echo "- Unit Tests (RoleManager)"
        [ $INTEGRATION_TESTS_PASSED -eq 0 ] && echo "- Integration Tests (User Management)"
        [ $SECURITY_TESTS_PASSED -eq 0 ] && echo "- Security Tests"
        [ $PERFORMANCE_TESTS_PASSED -eq 0 ] && echo "- Performance Tests"
        [ $COVERAGE_VALID -eq 0 ] && echo "- Coverage Thresholds"
        echo ""
        return 1
    fi
}

# Main execution
main() {
    echo "=================================="
    echo "  ROLE MANAGEMENT SYSTEM TESTS"
    echo "=================================="
    echo ""
    
    # Initialize test result variables
    UNIT_TESTS_PASSED=0
    INTEGRATION_TESTS_PASSED=0
    SECURITY_TESTS_PASSED=0
    PERFORMANCE_TESTS_PASSED=0
    COVERAGE_VALID=0
    ALL_TESTS_PASSED=0
    
    # Check prerequisites
    check_npm
    
    # Install dependencies
    install_dependencies
    
    # Run linting (non-blocking)
    run_lint || true
    
    echo ""
    print_status "Starting test execution..."
    echo ""
    
    # Run test suites
    if run_unit_tests; then
        UNIT_TESTS_PASSED=1
    fi
    
    echo ""
    
    if run_integration_tests; then
        INTEGRATION_TESTS_PASSED=1
    fi
    
    echo ""
    
    if run_security_tests; then
        SECURITY_TESTS_PASSED=1
    fi
    
    echo ""
    
    if run_performance_tests; then
        PERFORMANCE_TESTS_PASSED=1
    fi
    
    echo ""
    
    # Run full test suite with coverage
    run_full_test_suite
    
    echo ""
    
    # Validate coverage
    if validate_coverage; then
        COVERAGE_VALID=1
    fi
    
    # Generate coverage report
    generate_coverage_report
    
    # Check if all tests passed
    if [ $UNIT_TESTS_PASSED -eq 1 ] && [ $INTEGRATION_TESTS_PASSED -eq 1 ] && [ $SECURITY_TESTS_PASSED -eq 1 ] && [ $PERFORMANCE_TESTS_PASSED -eq 1 ] && [ $COVERAGE_VALID -eq 1 ]; then
        ALL_TESTS_PASSED=1
    fi
    
    # Display summary
    display_summary
    
    # Exit with appropriate code
    if [ $ALL_TESTS_PASSED -eq 1 ]; then
        exit 0
    else
        exit 1
    fi
}

# Handle command line arguments
case "${1:-}" in
    "unit")
        print_status "Running unit tests only..."
        check_npm
        install_dependencies
        run_unit_tests
        ;;
    "integration")
        print_status "Running integration tests only..."
        check_npm
        install_dependencies
        run_integration_tests
        ;;
    "security")
        print_status "Running security tests only..."
        check_npm
        install_dependencies
        run_security_tests
        ;;
    "performance")
        print_status "Running performance tests only..."
        check_npm
        install_dependencies
        run_performance_tests
        ;;
    "coverage")
        print_status "Running tests with coverage only..."
        check_npm
        install_dependencies
        run_full_test_suite
        generate_coverage_report
        ;;
    "help"|"-h"|"--help")
        echo "Role Management System Test Runner"
        echo ""
        echo "Usage: $0 [option]"
        echo ""
        echo "Options:"
        echo "  unit         Run unit tests only"
        echo "  integration  Run integration tests only"
        echo "  security     Run security tests only"
        echo "  performance  Run performance tests only"
        echo "  coverage     Run tests with coverage report"
        echo "  help         Show this help message"
        echo ""
        echo "Default: Run all tests with full validation"
        ;;
    *)
        main
        ;;
esac