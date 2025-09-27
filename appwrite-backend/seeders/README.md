# ImmuneMe Appwrite Database Seeders

A comprehensive database seeding system for the ImmuneMe Liberian immunization tracking application. This system populates your Appwrite cloud database with realistic seed data including facilities, vaccines, users, patients, immunization records, and notifications.

## 🚀 Quick Start

1. **Install Dependencies**
   ```bash
   cd appwrite-backend/seeders
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Appwrite credentials
   ```

3. **Run All Seeders**
   ```bash
   npm run seed
   ```

## 📋 Prerequisites

- Node.js 16.0.0 or higher
- Appwrite cloud account with project setup
- Database collections created (use `../populate-schemas.js` first)
- Valid API key with appropriate permissions

## ⚙️ Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Appwrite Configuration
APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=68a6e04b002d20c10020
APPWRITE_DATABASE_ID=68beb588001a9f2d71dc
APPWRITE_API_KEY=your_api_key_here

# Seeder Configuration
SEED_BATCH_SIZE=50
SEED_DELAY_MS=100
ENABLE_PROGRESS_LOGGING=true
CLEAN_BEFORE_SEED=false

# Data Generation Settings
GENERATE_REALISTIC_DATES=true
USE_LIBERIAN_NAMES=true
FACILITY_COUNT=25
PATIENT_COUNT=100
IMMUNIZATION_RECORDS_PER_PATIENT=8
NOTIFICATION_COUNT=200

# Authentication Settings
DEFAULT_PASSWORD=TempPass123!
ADMIN_EMAIL=admin@immuneme.lr
ADMIN_PASSWORD=AdminPass123!
```

### Required Appwrite Permissions

Your API key needs the following permissions:
- `databases.read`
- `databases.write` 
- `users.read`
- `users.write`
- `teams.read`
- `teams.write`

## 🗂️ Seeder Components

### 1. Facility Seeder (`facility-seeder.js`)
Creates realistic Liberian healthcare facilities including:
- Major hospitals (JFK Medical Center, Redemption Hospital, etc.)
- Community health centers
- Rural clinics
- Specialized immunization centers

**Data Generated:**
- 25 facilities across Liberian counties
- Realistic addresses and contact information
- District-based organization

### 2. Vaccine Seeder (`vaccine-seeder.js`)
Implements the complete Liberian EPI (Expanded Programme on Immunization) vaccine schedule:
- Standard vaccines (BCG, OPV, Penta, PCV, etc.)
- Supplementary immunizations (Vitamin A, TT)
- Proper sequence numbering and scheduling

**Data Generated:**
- 28 vaccines following Liberian EPI guidelines
- Vaccine series with proper sequencing
- Age-based scheduling information

### 3. User Profile Seeder (`user-profile-seeder.js`)
Creates Appwrite user accounts and associated profiles:
- System administrators
- Healthcare staff (doctors, nurses, supervisors)
- Patient accounts with profiles
- Proper role assignments and permissions

**Data Generated:**
- Admin users with full system access
- 20+ healthcare worker accounts
- 15+ patient user accounts
- Employee and patient profile records

### 4. Patient Seeder (`patient-seeder.js`)
Generates realistic patient records with Liberian demographics:
- Authentic Liberian names
- Age-appropriate birth dates
- Geographic distribution across districts
- Family relationships (mother/father names)

**Data Generated:**
- 100 patient records (configurable)
- Realistic demographic distribution
- Links to patient profiles where applicable
- Community health worker assignments

### 5. Immunization Seeder (`immunization-seeder.js`)
Creates realistic immunization records following proper schedules:
- Age-appropriate vaccine administration
- Realistic compliance rates
- Quality assurance tracking
- Healthcare worker assignments

**Data Generated:**
- 800+ immunization records
- Proper vaccine scheduling
- Batch numbers and tracking
- QA verification status

### 6. Notification Seeder (`notification-seeder.js`)
Generates notifications for various scenarios:
- Due vaccine reminders
- Overdue notifications
- Staff notifications
- Multi-channel delivery preferences

**Data Generated:**
- 200+ notifications
- Priority-based messaging
- Patient and staff notifications
- Realistic delivery status

## 🎯 Usage

### Run All Seeders
```bash
npm run seed
```
This runs the complete seeding process in dependency order.

### Run Individual Seeders
```bash
npm run seed:facilities    # Facilities only
npm run seed:vaccines      # Vaccines only
npm run seed:users         # Users and profiles only
npm run seed:patients      # Patients only
npm run seed:immunizations # Immunization records only
npm run seed:notifications # Notifications only
```

### Clean Database
```bash
npm run clean
```
**⚠️ WARNING:** This will delete all seeded data!

### Interactive Mode
The main seeder includes interactive prompts for:
- Confirmation before seeding
- Option to clean existing data
- Progress reporting

## 📊 Generated Data Overview

| Collection | Records | Description |
|------------|---------|-------------|
| Facilities | 25 | Liberian healthcare facilities |
| Vaccines | 28 | Complete EPI vaccine catalog |
| Users | 35+ | Admin, staff, and patient accounts |
| Employee Profiles | 20+ | Healthcare worker profiles |
| Patient Profiles | 15+ | Patient user profiles |
| Patients | 100 | Patient demographic records |
| Immunization Records | 800+ | Vaccination history |
| Notifications | 200+ | Due reminders and alerts |

## 🔧 Customization

### Adjusting Data Volume
Modify environment variables:
```env
FACILITY_COUNT=25          # Number of facilities
PATIENT_COUNT=100          # Number of patients
NOTIFICATION_COUNT=200     # Number of notifications
```

### Liberian Context
The seeders include authentic Liberian data:
- County and district names
- Common Liberian names
- Realistic phone number formats
- Local healthcare facility names

### Compliance Rates
Immunization compliance rates are realistic:
- Standard vaccines: 85% compliance
- Supplementary vaccines: 70% compliance
- Age-appropriate scheduling

## 🚨 Error Handling

The seeders include comprehensive error handling:
- Connection validation
- Rate limit management
- Dependency checking
- Rollback capabilities

### Common Issues

1. **Connection Failed**
   - Verify `APPWRITE_ENDPOINT` and `APPWRITE_PROJECT_ID`
   - Check API key permissions

2. **Rate Limits**
   - Increase `SEED_DELAY_MS` in environment
   - Reduce `SEED_BATCH_SIZE`

3. **Missing Collections**
   - Run `../populate-schemas.js` first
   - Verify database ID

## 🔐 Security Considerations

- API keys should have minimal required permissions
- Default passwords should be changed in production
- User accounts are created with temporary passwords
- Profile data includes realistic but fictional information

## 📈 Performance

- Batch processing with configurable delays
- Progress reporting and logging
- Memory-efficient streaming
- Rate limit compliance

## 🧪 Testing

The seeders can be used for:
- Development environment setup
- Testing data generation
- Demo preparations
- Load testing scenarios

## 🤝 Contributing

When adding new seeders:
1. Follow the existing pattern
2. Include proper error handling
3. Add progress reporting
4. Update this documentation
5. Test with various data volumes

## 📝 License

This seeding system is part of the ImmuneMe project and follows the same licensing terms.

---

**Need Help?** Check the individual seeder files for detailed implementation or create an issue in the project repository.