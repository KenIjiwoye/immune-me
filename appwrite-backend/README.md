# Appwrite Backend Implementation

This directory contains the Appwrite backend implementation for the Immune Me application, providing a cloud-native alternative to the current AdonisJS backend.

## Overview

The Appwrite backend leverages Appwrite's Backend-as-a-Service (BaaS) platform to provide:

- **Database Management**: NoSQL document-based collections for patient data, immunization records, and system entities
- **Authentication & Authorization**: Built-in user management with role-based access control
- **Real-time Updates**: WebSocket connections for live data synchronization
- **File Storage**: Secure file uploads and management for patient documents and reports
- **Cloud Functions**: Serverless functions for business logic, notifications, and data processing
- **API Gateway**: RESTful APIs with automatic documentation and SDK generation

## Architecture

The Appwrite implementation follows a microservices architecture with:

- **Collections**: Database schemas for core entities (patients, immunizations, facilities, etc.)
- **Functions**: Serverless functions for complex business logic and integrations
- **Security Rules**: Fine-grained permissions and access control
- **Real-time Subscriptions**: Live updates for critical data changes

## Directory Structure

- `functions/` - Appwrite Cloud Functions for business logic
- `schemas/` - Database collection schemas and validation rules
- `config/` - Appwrite project configuration and environment setup
- `utils/` - Shared utilities and helper functions
- `types/` - TypeScript type definitions for Appwrite entities
- `migrations/` - Data migration scripts and procedures

## Migration Strategy

This backend implementation is designed to:

1. **Parallel Development**: Run alongside the existing AdonisJS backend during transition
2. **Data Migration**: Provide tools to migrate existing data from PostgreSQL to Appwrite
3. **API Compatibility**: Maintain similar API contracts for seamless frontend integration
4. **Feature Parity**: Implement all existing backend functionality with enhanced capabilities

## Getting Started

### Quick Start

1. **Prerequisites**: Ensure Node.js 18+ and Appwrite CLI are installed
2. **Setup**: Run `./setup.sh` to initialize the configuration
3. **Configure**: Edit `config/.env` with your Appwrite project details
4. **Deploy**: Follow the [Setup Guide](SETUP_GUIDE.md) for complete deployment

### Detailed Setup

For comprehensive setup instructions, see [SETUP_GUIDE.md](SETUP_GUIDE.md).

### Configuration Files

- [`config/appwrite.json`](config/appwrite.json) - Main project configuration
- [`config/.env.example`](config/.env.example) - Environment variables template
- [`config/security-rules.json`](config/security-rules.json) - Security and permissions
- [`config/README.md`](config/README.md) - Detailed configuration documentation

### Project Structure

```
appwrite-backend/
├── config/                    # Configuration files
│   ├── appwrite.json         # Main Appwrite configuration
│   ├── appwrite.production.json # Production configuration
│   ├── .env.example          # Environment variables template
│   ├── security-rules.json   # Security rules and permissions
│   └── README.md             # Configuration documentation
├── functions/                 # Cloud functions
│   ├── notifications/        # Notification functions
│   ├── reports/             # Report generation functions
│   └── data-sync/           # Data synchronization functions
├── schemas/                  # Database schemas (existing)
├── utils/                   # Shared utilities
├── types/                   # TypeScript definitions
├── migrations/              # Data migration scripts
├── setup.sh                 # Setup automation script
└── SETUP_GUIDE.md          # Complete setup guide
```

## Benefits

- **Reduced Infrastructure Complexity**: Managed backend services
- **Scalability**: Auto-scaling cloud functions and database
- **Real-time Capabilities**: Built-in WebSocket support
- **Security**: Enterprise-grade security and compliance
- **Developer Experience**: Rich SDKs and development tools