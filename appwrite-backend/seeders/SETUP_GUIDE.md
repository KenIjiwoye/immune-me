# ImmuneMe Database Seeder Setup Guide

This guide will walk you through setting up and running the ImmuneMe database seeders for your Appwrite cloud database.

## 📋 Prerequisites Checklist

- [ ] Node.js 16.0.0 or higher installed
- [ ] Appwrite cloud account created
- [ ] ImmuneMe project created in Appwrite
- [ ] Database collections created using `populate-schemas.js`
- [ ] API key with appropriate permissions

## 🔧 Step-by-Step Setup

### Step 1: Verify Appwrite Project Setup

1. **Login to Appwrite Console**
   - Go to [https://cloud.appwrite.io](https://cloud.appwrite.io)
   - Login to your account

2. **Verify Project Details**
   - Project ID: `68a6e04b002d20c10020`
   - Database ID: `68beb588001a9f2d71dc`
   - Endpoint: `https://fra.cloud.appwrite.io/v1`

3. **Check Collections Exist**
   Navigate to your database and verify these collections exist:
   - `facilities`
   - `vaccines`
   - `employee_profiles`
   - `patient_profiles`
   - `patients`
   - `immunization_records`
   - `notifications`

### Step 2: Create API Key

1. **Navigate to API Keys**
   - In your Appwrite project, go to "Settings" → "API Keys"

2. **Create New Key**
   - Click "Add API Key"
   - Name: `Database Seeder Key`
   - Expiration: Set appropriate expiration date

3. **Set Permissions**
   Select these scopes:
   - `databases.read`
   - `databases.write`
   - `users.read`
   - `users.write`
   - `teams.read`
   - `teams.write`

4. **Copy API Key**
   - Save the generated API key securely
   - You'll need this for the `.env` file

### Step 3: Install Dependencies

```bash
cd appwrite-backend/seeders
npm install
```

### Step 4: Configure Environment

1. **Copy Environment Template**
   ```bash
   cp .env.example .env
   ```

2. **Edit .env File**
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

3. **Replace Placeholder Values**
   - `APPWRITE_API_KEY`: Use the API key from Step 2
   - `ADMIN_EMAIL`: Your preferred admin email
   - `ADMIN_PASSWORD`: Strong password for admin account

### Step 5: Test Connection

```bash
node database-seeder.js --test-connection
```

If successful, you should see:
```
✅ Appwrite connection validated successfully
```

### Step 6: Run Seeders

#### Option A: Interactive Mode (Recommended)
```bash
npm run seed
```

This will:
- Validate your connection
- Ask for confirmation
- Optionally clean existing data
- Run all seeders in proper order
- Show progress and statistics

#### Option B: Individual Seeders
```bash
npm run seed:facilities    # Create facilities first
npm run seed:vaccines      # Create vaccines
npm run seed:users         # Create users and profiles
npm run seed:patients      # Create patients
npm run seed:immunizations # Create immunization records
npm run seed:notifications # Create notifications
```

## 🎯 Expected Results

After successful seeding, you should have:

| Collection | Records | Description |
|------------|---------|-------------|
| facilities | 25 | Healthcare facilities across Liberia |
| vaccines | 28 | Complete EPI vaccine catalog |
| users | 35+ | System users (admin, staff, patients) |
| employee_profiles | 20+ | Healthcare worker profiles |
| patient_profiles | 15+ | Patient user profiles |
| patients | 100 | Patient demographic records |
| immunization_records | 800+ | Vaccination history |
| notifications | 200+ | Due reminders and alerts |

## 🔍 Verification Steps

### 1. Check Appwrite Console
- Navigate to your database in Appwrite console
- Verify all collections have data
- Check document counts match expectations

### 2. Test User Accounts
- Try logging in with admin credentials
- Verify user roles and labels are set correctly

### 3. Verify Relationships
- Check that patients are linked to facilities
- Verify immunization records reference correct patients/vaccines
- Confirm notifications are properly associated

## 🚨 Troubleshooting

### Connection Issues
```
❌ Connection failed: Invalid API key
```
**Solution:** Verify API key and permissions in Appwrite console

### Rate Limit Errors
```
❌ Too many requests
```
**Solution:** Increase `SEED_DELAY_MS` in `.env` file

### Missing Collections
```
❌ Collection 'facilities' not found
```
**Solution:** Run `../populate-schemas.js` first to create collections

### Memory Issues
```
❌ JavaScript heap out of memory
```
**Solution:** Reduce `PATIENT_COUNT` and other volume settings in `.env`

## 🔄 Re-running Seeders

### Clean and Re-seed
```bash
npm run clean  # Removes all seeded data
npm run seed   # Creates fresh data
```

### Update Existing Data
Individual seeders can be re-run to add more data:
```bash
npm run seed:patients      # Add more patients
npm run seed:notifications # Add more notifications
```

## 📊 Monitoring Progress

The seeders provide detailed progress information:
- Real-time progress indicators
- Batch processing status
- Error reporting with context
- Final statistics summary

## 🔐 Security Notes

1. **API Key Security**
   - Never commit `.env` file to version control
   - Use environment-specific API keys
   - Rotate keys regularly

2. **Default Passwords**
   - Change default passwords in production
   - Use strong, unique passwords
   - Consider implementing password policies

3. **Data Privacy**
   - Seeded data is fictional but realistic
   - No real patient information is used
   - Suitable for development and testing only

## 📞 Support

If you encounter issues:

1. **Check Logs**
   - Review console output for specific errors
   - Enable detailed logging with `ENABLE_PROGRESS_LOGGING=true`

2. **Verify Prerequisites**
   - Confirm all collections exist
   - Check API key permissions
   - Validate environment configuration

3. **Common Solutions**
   - Restart with clean database
   - Reduce data volume for testing
   - Check network connectivity

## 🎉 Success!

Once seeding is complete, your ImmuneMe application will have:
- Realistic test data for development
- Complete vaccine schedules
- User accounts for testing
- Sample notifications and records
- Proper data relationships

You're now ready to test the full ImmuneMe application with comprehensive seed data!