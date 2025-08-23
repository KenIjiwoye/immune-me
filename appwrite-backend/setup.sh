#!/bin/bash

# Appwrite Setup Script for Immune Me
# This script helps set up the Appwrite backend infrastructure

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="$SCRIPT_DIR/config"
ENV_FILE="$CONFIG_DIR/.env"

# Functions
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  Immune Me Appwrite Setup${NC}"
    echo -e "${BLUE}================================${NC}"
    echo
}

print_step() {
    echo -e "${YELLOW}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

check_prerequisites() {
    print_step "Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node --version)"
        exit 1
    fi
    
    # Check if Appwrite CLI is installed
    if ! command -v appwrite &> /dev/null; then
        print_info "Appwrite CLI not found. Installing..."
        npm install -g appwrite-cli
        if [ $? -eq 0 ]; then
            print_success "Appwrite CLI installed successfully"
        else
            print_error "Failed to install Appwrite CLI"
            exit 1
        fi
    else
        print_success "Appwrite CLI is already installed ($(appwrite --version))"
    fi
    
    print_success "Prerequisites check completed"
}

setup_environment() {
    print_step "Setting up environment configuration..."
    
    if [ ! -f "$ENV_FILE" ]; then
        print_info "Creating environment file from template..."
        cp "$CONFIG_DIR/.env.example" "$ENV_FILE"
        print_success "Environment file created at $ENV_FILE"
        print_info "Please edit $ENV_FILE with your actual Appwrite project details"
    else
        print_info "Environment file already exists at $ENV_FILE"
    fi
}

validate_config() {
    print_step "Validating configuration files..."
    
    # Check if appwrite.json exists
    if [ ! -f "$CONFIG_DIR/appwrite.json" ]; then
        print_error "appwrite.json not found in $CONFIG_DIR"
        exit 1
    fi
    
    # Check if security-rules.json exists
    if [ ! -f "$CONFIG_DIR/security-rules.json" ]; then
        print_error "security-rules.json not found in $CONFIG_DIR"
        exit 1
    fi
    
    # Validate JSON syntax
    if ! python3 -m json.tool "$CONFIG_DIR/appwrite.json" > /dev/null 2>&1; then
        print_error "Invalid JSON syntax in appwrite.json"
        exit 1
    fi
    
    if ! python3 -m json.tool "$CONFIG_DIR/security-rules.json" > /dev/null 2>&1; then
        print_error "Invalid JSON syntax in security-rules.json"
        exit 1
    fi
    
    print_success "Configuration files validated"
}

test_connectivity() {
    print_step "Testing Appwrite connectivity..."
    
    # Source environment variables
    if [ -f "$ENV_FILE" ]; then
        source "$ENV_FILE"
    else
        print_error "Environment file not found. Please run setup first."
        exit 1
    fi
    
    # Check if required variables are set
    if [ -z "$APPWRITE_ENDPOINT" ] || [ -z "$APPWRITE_PROJECT_ID" ]; then
        print_error "APPWRITE_ENDPOINT and APPWRITE_PROJECT_ID must be set in $ENV_FILE"
        exit 1
    fi
    
    # Test health endpoint
    print_info "Testing health endpoint..."
    if curl -s "$APPWRITE_ENDPOINT/health" > /dev/null; then
        print_success "Appwrite endpoint is accessible"
    else
        print_error "Cannot reach Appwrite endpoint: $APPWRITE_ENDPOINT"
        exit 1
    fi
    
    # Test project access (if API key is provided)
    if [ -n "$APPWRITE_API_KEY" ]; then
        print_info "Testing project access..."
        appwrite client --endpoint="$APPWRITE_ENDPOINT" --projectId="$APPWRITE_PROJECT_ID" --key="$APPWRITE_API_KEY"
        
        if appwrite health get > /dev/null 2>&1; then
            print_success "Project access verified"
        else
            print_error "Cannot access project. Please check your API key and project ID."
            exit 1
        fi
    else
        print_info "API key not provided. Skipping project access test."
    fi
}

deploy_configuration() {
    print_step "Deploying Appwrite configuration..."
    
    # Source environment variables
    source "$ENV_FILE"
    
    # Set Appwrite client configuration
    appwrite client --endpoint="$APPWRITE_ENDPOINT" --projectId="$APPWRITE_PROJECT_ID" --key="$APPWRITE_API_KEY"
    
    print_info "Deploying database collections..."
    if appwrite deploy collection --all; then
        print_success "Database collections deployed"
    else
        print_error "Failed to deploy database collections"
        exit 1
    fi
    
    print_info "Deploying storage buckets..."
    if appwrite deploy bucket --all; then
        print_success "Storage buckets deployed"
    else
        print_error "Failed to deploy storage buckets"
        exit 1
    fi
    
    print_info "Deploying functions..."
    if appwrite deploy function --all; then
        print_success "Functions deployed"
    else
        print_error "Failed to deploy functions"
        exit 1
    fi
    
    print_success "Configuration deployment completed"
}

create_initial_data() {
    print_step "Creating initial data..."
    
    # Create default admin user (if not exists)
    print_info "Setting up initial admin user..."
    # This would typically be done through the Appwrite console or API
    print_info "Please create an admin user through the Appwrite console"
    
    # Create default teams
    print_info "Creating default teams..."
    # This would be done through API calls
    print_info "Teams will be created during first deployment"
    
    print_success "Initial data setup completed"
}

show_next_steps() {
    print_step "Setup completed! Next steps:"
    echo
    echo "1. Review and update environment variables in:"
    echo "   $ENV_FILE"
    echo
    echo "2. Create Appwrite projects (if not done already):"
    echo "   - Development: immune-me-dev"
    echo "   - Production: immune-me-production"
    echo
    echo "3. Generate API keys for both environments"
    echo
    echo "4. Test the setup:"
    echo "   ./setup.sh --test"
    echo
    echo "5. Deploy to production:"
    echo "   ./setup.sh --deploy-prod"
    echo
    echo "6. Access Appwrite console:"
    echo "   https://cloud.appwrite.io/console"
    echo
    print_success "Appwrite backend setup is ready!"
}

# Main execution
main() {
    print_header
    
    case "${1:-setup}" in
        "setup"|"")
            check_prerequisites
            setup_environment
            validate_config
            show_next_steps
            ;;
        "--test"|"test")
            test_connectivity
            ;;
        "--deploy"|"deploy")
            validate_config
            deploy_configuration
            create_initial_data
            ;;
        "--deploy-prod"|"deploy-prod")
            print_info "Switching to production configuration..."
            cp "$CONFIG_DIR/appwrite.production.json" "$CONFIG_DIR/appwrite.json"
            validate_config
            deploy_configuration
            create_initial_data
            print_info "Switching back to development configuration..."
            git checkout "$CONFIG_DIR/appwrite.json" 2>/dev/null || true
            ;;
        "--help"|"help")
            echo "Usage: $0 [command]"
            echo
            echo "Commands:"
            echo "  setup (default)  - Initial setup and configuration"
            echo "  test            - Test connectivity and configuration"
            echo "  deploy          - Deploy configuration to development"
            echo "  deploy-prod     - Deploy configuration to production"
            echo "  help            - Show this help message"
            echo
            ;;
        *)
            print_error "Unknown command: $1"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"