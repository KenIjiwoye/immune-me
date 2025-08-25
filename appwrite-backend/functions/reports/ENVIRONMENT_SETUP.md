# Environment Setup Guide - Immunization Reporting Functions

## Quick Start Guide

This guide will help you set up the complete development and deployment environment for the immunization reporting functions.

## System Requirements

### Operating System
- **macOS**: 10.15 (Catalina) or later
- **Windows**: Windows 10 or later
- **Linux**: Ubuntu 18.04+, CentOS 7+, or equivalent

### Required Software
| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 18.0+ | Runtime environment |
| npm | 8.0+ | Package management |
| Git | 2.20+ | Version control |
| Appwrite CLI | 4.0+ | Deployment tool |
| Docker | 20.10+ | Containerization (optional) |

## Installation Steps

### 1. Install Node.js and npm

#### macOS
```bash
# Using Homebrew
brew install node

# Using Node Version Manager (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

#### Windows
```bash
# Using Chocolatey
choco install nodejs

# Or download from https://nodejs.org/
```

#### Linux
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

### 2. Install Appwrite CLI

```bash
# Using npm (recommended)
npm install -g appwrite-cli

# Verify installation
appwrite --version
```

### 3. Install Git

```bash
# macOS
brew install git

# Windows (via Chocolatey)
choco install git

# Linux
sudo apt-get install git  # Ubuntu/Debian
sudo yum install git      # CentOS/RHEL
```

### 4. Install Docker (Optional)

```bash
# macOS
brew install --cask docker

# Windows
# Download from https://docker.com/products/docker-desktop

# Linux
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

## Project Setup

### 1. Clone the Repository

```bash
# Clone the project
git clone <repository-url>
cd appwrite-backend/functions/reports

# Verify directory structure
ls -la
```

### 2. Install Dependencies

```bash
# Install dependencies for all functions
for dir in */; do
  if [ -f "$dir/package.json" ]; then
    echo "📦 Installing dependencies for $dir"
    cd "$dir" && npm install && cd ..
  fi
done

# Install global test dependencies
npm install -g axios
npm install -g jest
```

### 3. Environment Configuration

#### Create Environment Files

```bash
# Copy example files
find . -name ".env.example" -exec sh -c 'cp "$1" "${1%.example}"' _ {} \;

# Create master environment file
cat > .env.master << EOF
# Appwrite Configuration
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-api-key

# Database Configuration
DATABASE_ID=immunization-db
PATIENTS_COLLECTION_ID=patients
VACCINES_COLLECTION_ID=vaccines
IMMUNIZATION_RECORDS_COLLECTION_ID=immunization-records
FACILITIES_COLLECTION_ID=facilities

# Storage Configuration
BUCKET_ID=reports

# Function Configuration
FUNCTION_TIMEOUT=30000
MAX_MEMORY=512
EOF
```

#### Environment Variables by Function

Create individual `.env` files for each function:

**due-immunizations-list/.env**
```bash
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-api-key
DATABASE_ID=immunization-db
PATIENTS_COLLECTION_ID=patients
IMMUNIZATION_RECORDS_COLLECTION_ID=immunization-records
VACCINES_COLLECTION_ID=vaccines
```

**vaccine-usage-statistics/.env**
```bash
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-api-key
DATABASE_ID=immunization-db
IMMUNIZATION_RECORDS_COLLECTION_ID=immunization-records
VACCINES_COLLECTION_ID=vaccines
```

**generate-pdf-report/.env**
```bash
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-api-key
DATABASE_ID=immunization-db
BUCKET_ID=reports
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

### 4. Appwrite CLI Configuration

```bash
# Initialize Appwrite CLI
appwrite init

# Login to Appwrite
appwrite login

# Select your project
appwrite client --projectId your-project-id
```

## Development Environment Setup

### 1. Local Development Server

```bash
# Start local development (if using local Appwrite)
docker run -d --name appwrite -p 80:80 -p 443:443 \
  -v /tmp/appwrite:/usr/src/code/appwrite:rw \
  -e _APP_ENV=development \
  -e _APP_OPENSSL_KEY_V1=your-secret-key \
  -e _APP_DOMAIN=localhost \
  -e _APP_DOMAIN_TARGET=localhost \
  -e _APP_REDIS_HOST=redis \
  -e _APP_DB_HOST=mariadb \
  -e _APP_DB_PORT=3306 \
  -e _APP_DB_SCHEMA=appwrite \
  -e _APP_DB_USER=user \
  -e _APP_DB_PASS=password \
  appwrite/appwrite:latest
```

### 2. IDE Configuration

#### VS Code Extensions
Install these recommended extensions:
- ESLint
- Prettier
- Appwrite
- Thunder Client (for API testing)

#### VS Code Settings
Create `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.enable": true,
  "files.associations": {
    "*.env*": "properties"
  }
}
```

### 3. Linting and Formatting

```bash
# Install development dependencies
npm install --save-dev eslint prettier eslint-config-prettier

# Create ESLint configuration
cat > .eslintrc.json << EOF
{
  "extends": ["eslint:recommended"],
  "env": {
    "node": true,
    "es2021": true
  },
  "parserOptions": {
    "ecmaVersion": 2021
  }
}
EOF

# Create Prettier configuration
cat > .prettierrc << EOF
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
EOF
```

## Testing Environment

### 1. Test Data Setup

```bash
# Create test data script
cat > scripts/setup-test-data.js << 'EOF'
const { Client, Databases, ID } = require('node-appwrite');

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function setupTestData() {
  console.log('Setting up test data...');
  
  // Create test patients
  const patients = [
    {
      firstName: 'Test',
      lastName: 'Patient1',
      dateOfBirth: '2020-01-15',
      gender: 'male',
      facilityId: 'test-facility-1'
    },
    {
      firstName: 'Test',
      lastName: 'Patient2',
      dateOfBirth: '2019-06-20',
      gender: 'female',
      facilityId: 'test-facility-1'
    }
  ];
  
  for (const patient of patients) {
    await databases.createDocument(
      process.env.DATABASE_ID,
      process.env.PATIENTS_COLLECTION_ID,
      ID.unique(),
      patient
    );
  }
  
  console.log('Test data setup complete');
}

setupTestData().catch(console.error);
EOF

# Install node-appwrite for test scripts
npm install node-appwrite

# Run test data setup
node scripts/setup-test-data.js
```

### 2. Run Tests

```bash
# Run master test suite
node master-test-suite.js

# Run individual function tests
cd due-immunizations-list && npm test && cd ..
cd vaccine-usage-statistics && npm test && cd ..
```

## Environment-Specific Configurations

### Development Environment
```bash
# Create development environment file
cat > .env.development << EOF
APPWRITE_ENDPOINT=http://localhost/v1
APPWRITE_PROJECT_ID=dev-project-id
APPWRITE_API_KEY=dev-api-key
DATABASE_ID=immunization-db
BUCKET_ID=reports
EOF
```

### Staging Environment
```bash
# Create staging environment file
cat > .env.staging << EOF
APPWRITE_ENDPOINT=https://staging.appwrite.io/v1
APPWRITE_PROJECT_ID=staging-project-id
APPWRITE_API_KEY=staging-api-key
DATABASE_ID=immunization-db
BUCKET_ID=reports
EOF
```

### Production Environment
```bash
# Create production environment file
cat > .env.production << EOF
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=prod-project-id
APPWRITE_API_KEY=prod-api-key
DATABASE_ID=immunization-db
BUCKET_ID=reports
EOF
```

## Verification Steps

### 1. Verify Installation
```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check Appwrite CLI
appwrite --version

# Check Git
git --version
```

### 2. Verify Appwrite Connection
```bash
# Test Appwrite connection
appwrite health
```

### 3. Verify Function Deployment
```bash
# List all functions
appwrite functions list

# Test a specific function
appwrite functions createExecution --functionId due-immunizations-list --data '{}'
```

## Troubleshooting

### Common Issues

#### Node.js Version Issues
```bash
# Check current version
node --version

# Switch to correct version using nvm
nvm use 18
```

#### Permission Issues
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm

# Fix Appwrite CLI permissions
sudo chown -R $(whoami) ~/.appwrite
```

#### Environment Variable Issues
```bash
# Check if variables are loaded
echo $APPWRITE_ENDPOINT
echo $APPWRITE_PROJECT_ID

# Load environment variables
source .env
```

### Getting Help
- Check the [troubleshooting guide](TROUBLESHOOTING.md)
- Review Appwrite documentation: https://appwrite.io/docs
- Check function logs in Appwrite Console

## Next Steps

After completing environment setup:
1. Proceed to [deployment documentation](DEPLOYMENT.md)
2. Run the [validation checklist](VALIDATION_CHECKLIST.md)
3. Set up [monitoring](MONITORING.md)
4. Configure [performance benchmarks](PERFORMANCE_BENCHMARKS.md)