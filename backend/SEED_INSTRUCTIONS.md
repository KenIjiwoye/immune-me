# Database Seeding Instructions

## Vaccine Seeder Created

A comprehensive vaccine seeder has been created that includes all Liberia EPI standard vaccines:

### Vaccines Included (26 total):
- **BCG** (1 vaccine)
- **OPV Series** (4 vaccines: OPV-0, OPV-1, OPV-2, OPV-3)
- **Penta Series** (3 vaccines: Penta-1, Penta-2, Penta-3)
- **PCV Series** (3 vaccines: PCV-1, PCV-2, PCV-3)
- **Rota Series** (2 vaccines: Rota-1, Rota-2)
- **IPV** (1 vaccine)
- **MCV Series** (2 vaccines: MCV-1, MCV-2)
- **Yellow Fever** (1 vaccine)
- **TCV** (1 vaccine)
- **Vitamin A Series** (4 vaccines: Vitamin A-1 to A-4)
- **Tetanus Toxoid Series** (5 vaccines: TT-1 to TT-5)

## How to Run the Seeders

### Option 1: Run All Seeders
```bash
cd backend
node ace db:seed
```

### Option 2: Run Individual Seeders
```bash
cd backend
node ace db:seed --files="database/seeders/user_seeder"
node ace db:seed --files="database/seeders/vaccine_seeder"
```

### Option 3: Using Docker
```bash
# If using Docker development
docker-compose exec backend node ace db:seed
```

## What the Seeders Do

### User Seeder
- Creates 2 test facilities (Central Health Center, Community Clinic)
- Creates 1 admin user (admin@example.com / password123)
- Creates 1 regular user (user@example.com / password123)

### Vaccine Seeder
- Creates all 26 standard Liberia EPI vaccines
- Sets proper vaccine codes, sequences, and schedule ages
- Marks supplementary vaccines appropriately
- All vaccines are set as active by default

## Verification

After running the seeders, you can verify the vaccines were created by:
1. Logging into the app
2. Navigating to the immunization recording screen
3. Checking the vaccine selector dropdown
4. Or accessing the admin vaccine management section (if admin user)

## Troubleshooting

If you encounter issues:
1. Make sure the database is running
2. Ensure migrations have been run: `node ace migration:run`
3. Clear existing data if needed: `node ace db:seed --force`
4. Check database connection in `.env` file
