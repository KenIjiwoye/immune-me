#!/bin/bash

# Immunization Reporting Functions - Automated Deployment Script
# This script automates the deployment of all reporting functions to Appwrite

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="Immunization Reporting Functions"
ENVIRONMENT=${1:-development}
CONFIG_FILE="deployment-config.json"
LOG_FILE="deployment-$(date +%Y%m%d-%H%M%S).log"

# Functions to deploy
FUNCTIONS=(
  "due-immunizations-list"
  "vaccine-usage-statistics"
  "generate-pdf-report"
  "generate-excel-export"
  "generate-csv-export"
  "immunization-coverage-report"
  "age-distribution-analysis"
  "facility-performance-metrics"
  "scheduled-weekly-reports"
)

# Print header
print_header() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                Immunization Reporting Functions              ║"
    echo "║                    Automated Deployment                      ║"
    echo "║                    Environment: $ENVIRONMENT                    ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Log function
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")
            echo -e "${GREEN}[INFO]${NC} $timestamp - $message" | tee -a "$LOG_FILE"
            ;;
        "WARN")
            echo -e "${YELLOW}[WARN]${NC} $timestamp - $message" | tee -a "$LOG_FILE"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} $timestamp - $message" | tee -a "$LOG_FILE"
            ;;
        "STEP")
            echo -e "${BLUE}[STEP]${NC} $timestamp - $message" | tee -a "$LOG_FILE"
            ;;
    esac
}

# Check prerequisites
check_prerequisites() {
    log "STEP" "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log "ERROR" "Node.js is not installed"
        exit 1
    fi
    
    # Check Appwrite CLI
    if ! command -v appwrite &> /dev/null; then
        log "ERROR" "Appwrite CLI is not installed"
        exit 1
    fi
    
    # Check if logged in
    if ! appwrite client --get-endpoint &> /dev/null; then
        log "ERROR" "Not logged into Appwrite CLI. Run 'appwrite login' first"
        exit 1
    fi
    
    # Check environment variables
    if [[ -z "$APPWRITE_PROJECT_ID" ]]; then
        log "ERROR" "APPWRITE_PROJECT_ID environment variable not set"
        exit 1
    fi
    
    log "INFO" "All prerequisites satisfied"
}

# Setup environment
setup_environment() {
    log "STEP" "Setting up environment..."
    
    # Load environment-specific configuration
    if [[ -f ".env.$ENVIRONMENT" ]]; then
        source ".env.$ENVIRONMENT"
        log "INFO" "Loaded environment configuration from .env.$ENVIRONMENT"
    else
        log "WARN" "Environment file .env.$ENVIRONMENT not found, using defaults"
    fi
    
    # Create log directory
    mkdir -p logs
}

# Install dependencies
install_dependencies() {
    log "STEP" "Installing dependencies..."
    
    for function_dir in "${FUNCTIONS[@]}"; do
        if [[ -d "$function_dir" ]]; then
            log "INFO" "Installing dependencies for $function_dir"
            cd "$function_dir"
            npm install --silent
            cd ..
        fi
    done
}

# Create database and collections
setup_database() {
    log "STEP" "Setting up database and collections..."
    
    # Create database
    log "INFO" "Creating database: $DATABASE_ID"
    appwrite databases create \
        --databaseId "$DATABASE_ID" \
        --name "Immunization Database" \
        --quiet || log "WARN" "Database may already exist"
    
    # Create collections
    local collections=("patients" "vaccines" "immunization-records" "facilities")
    
    for collection in "${collections[@]}"; do
        log "INFO" "Creating collection: $collection"
        appwrite databases createCollection \
            --databaseId "$DATABASE_ID" \
            --collectionId "$collection" \
            --name "$(echo $collection | sed 's/-/ /g' | sed 's/\b\(.\)/\u\1/g')" \
            --quiet || log "WARN" "Collection $collection may already exist"
    done
}

# Create storage bucket
setup_storage() {
    log "STEP" "Setting up storage bucket..."
    
    log "INFO" "Creating storage bucket: $BUCKET_ID"
    appwrite storage createBucket \
        --bucketId "$BUCKET_ID" \
        --name "Reports" \
        --maximumFileSize 10485760 \
        --allowedFileExtensions pdf xlsx csv json \
        --quiet || log "WARN" "Bucket $BUCKET_ID may already exist"
}

# Deploy individual function
deploy_function() {
    local function_name=$1
    local function_dir=$function_name
    
    log "STEP" "Deploying function: $function_name"
    
    # Check if function exists
    if appwrite functions get --functionId "$function_name" &> /dev/null; then
        log "INFO" "Function $function_name already exists, updating..."
    else
        log "INFO" "Creating new function: $function_name"
        
        # Create function
        appwrite functions create \
            --functionId "$function_name" \
            --name "$(echo $function_name | sed 's/-/ /g' | sed 's/\b\(.\)/\u\1/g')" \
            --runtime node-18.0 \
            --entrypoint src/main.js \
            --quiet
    fi
    
    # Deploy code
    cd "$function_dir"
    
    # Create deployment
    local deployment_id=$(appwrite functions createDeployment \
        --functionId "$function_name" \
        --entrypoint src/main.js \
        --activate true \
        --quiet | jq -r '.id')
    
    if [[ -n "$deployment_id" ]]; then
        log "INFO" "Successfully deployed $function_name (deployment: $deployment_id)"
    else
        log "ERROR" "Failed to deploy $function_name"
        exit 1
    fi
    
    cd ..
}

# Configure function variables
configure_variables() {
    local function_name=$1
    
    log "STEP" "Configuring variables for $function_name"
    
    # Common variables
    local common_vars=(
        "APPWRITE_ENDPOINT=$APPWRITE_ENDPOINT"
        "APPWRITE_PROJECT_ID=$APPWRITE_PROJECT_ID"
        "APPWRITE_API_KEY=$APPWRITE_API_KEY"
        "DATABASE_ID=$DATABASE_ID"
        "BUCKET_ID=$BUCKET_ID"
    )
    
    # Function-specific variables
    local specific_vars=()
    
    case $function_name in
        "due-immunizations-list")
            specific_vars+=(
                "PATIENTS_COLLECTION_ID=patients"
                "IMMUNIZATION_RECORDS_COLLECTION_ID=immunization-records"
                "VACCINES_COLLECTION_ID=vaccines"
            )
            ;;
        "vaccine-usage-statistics")
            specific_vars+=(
                "IMMUNIZATION_RECORDS_COLLECTION_ID=immunization-records"
                "VACCINES_COLLECTION_ID=vaccines"
            )
            ;;
        "facility-performance-metrics")
            specific_vars+=(
                "FACILITIES_COLLECTION_ID=facilities"
                "IMMUNIZATION_RECORDS_COLLECTION_ID=immunization-records"
                "PATIENTS_COLLECTION_ID=patients"
            )
            ;;
        "immunization-coverage-report")
            specific_vars+=(
                "PATIENTS_COLLECTION_ID=patients"
                "IMMUNIZATION_RECORDS_COLLECTION_ID=immunization-records"
                "VACCINES_COLLECTION_ID=vaccines"
            )
            ;;
        "age-distribution-analysis")
            specific_vars+=(
                "PATIENTS_COLLECTION_ID=patients"
                "IMMUNIZATION_RECORDS_COLLECTION_ID=immunization-records"
            )
            ;;
    esac
    
    # Combine all variables
    local all_vars=("${common_vars[@]}" "${specific_vars[@]}")
    
    # Update function variables
    for var in "${all_vars[@]}"; do
        appwrite functions update \
            --functionId "$function_name" \
            --vars "$var" \
            --quiet
    done
}

# Configure scheduled functions
configure_schedules() {
    log "STEP" "Configuring scheduled functions..."
    
    # Due immunizations - daily at 6 AM
    appwrite functions update \
        --functionId "due-immunizations-list" \
        --schedule "0 6 * * *" \
        --quiet
    
    # Vaccine usage - weekly on Monday at 7 AM
    appwrite functions update \
        --functionId "vaccine-usage-statistics" \
        --schedule "0 7 * * 1" \
        --quiet
    
    # Weekly reports - weekly on Monday at 6 AM
    appwrite functions update \
        --functionId "scheduled-weekly-reports" \
        --schedule "0 6 * * 1" \
        --quiet
    
    log "INFO" "Scheduled functions configured"
}

# Run tests
run_tests() {
    log "STEP" "Running validation tests..."
    
    # Run master test suite
    if [[ -f "master-test-suite.js" ]]; then
        log "INFO" "Running master test suite..."
        node master-test-suite.js
    fi
    
    # Run integration tests
    if [[ -f "integration-tests.js" ]]; then
        log "INFO" "Running integration tests..."
        node integration-tests.js
    fi
    
    # Run performance benchmarks
    if [[ -f "performance-benchmarks.js" ]]; then
        log "INFO" "Running performance benchmarks..."
        node performance-benchmarks.js
    fi
}

# Health check
health_check() {
    log "STEP" "Performing health check..."
    
    for function_name in "${FUNCTIONS[@]}"; do
        log "INFO" "Testing $function_name..."
        
        # Create test execution
        local result=$(appwrite functions createExecution \
            --functionId "$function_name" \
            --data '{"test": true}' \
            --quiet)
        
        local status=$(echo "$result" | jq -r '.status')
        
        if [[ "$status" == "completed" ]]; then
            log "INFO" "✅ $function_name health check passed"
        else
            log "ERROR" "❌ $function_name health check failed"
            exit 1
        fi
    done
}

# Generate deployment report
generate_report() {
    log "STEP" "Generating deployment report..."
    
    cat > "deployment-report-$(date +%Y%m%d-%H%M%S).json" << EOF
{
    "deployment": {
        "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
        "environment": "$ENVIRONMENT",
        "project": "$PROJECT_NAME",
        "functions": $(printf '%s\n' "${FUNCTIONS[@]}" | jq -R . | jq -s .),
        "status": "success"
    }
}
EOF
    
    log "INFO" "Deployment report generated"
}

# Main deployment function
main() {
    print_header
    
    # Initialize
    setup_environment
    check_prerequisites
    
    # Deploy infrastructure
    setup_database
    setup_storage
    
    # Deploy functions
    install_dependencies
    
    for function_name in "${FUNCTIONS[@]}"; do
        deploy_function "$function_name"
        configure_variables "$function_name"
    done
    
    # Configure schedules
    configure_schedules
    
    # Validate
    run_tests
    health_check
    
    # Finalize
    generate_report
    
    log "INFO" "🎉 Deployment completed successfully!"
    log "INFO" "Check deployment-report-*.json for details"
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [environment]"
        echo "Environments: development, staging, production"
        echo "Example: $0 production"
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac