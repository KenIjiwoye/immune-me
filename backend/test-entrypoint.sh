#!/bin/sh
# Test script to demonstrate the conditional migration/seeding approach

echo "=== Testing ImmuneMe Conditional Migration/Seeding ==="
echo ""

# Test the logic without actually running migrations
echo "1. Testing database connectivity check..."
echo "   Command: pg_isready -h localhost -p 5432 -U postgres"
echo "   (This would check if PostgreSQL is running)"

echo ""
echo "2. Testing migration table check..."
echo "   SQL: SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'adonis_schema');"
echo "   Returns 't' if migrations table exists, 'f' otherwise"

echo ""
echo "3. Testing pending migrations check..."
echo "   Counts migration files vs applied migrations in adonis_schema table"

echo ""
echo "4. Testing seeding check..."
echo "   SQL: SELECT COUNT(*) FROM users;"
echo "   Only seeds if count = 0 and users table exists"

echo ""
echo "=== How to use this solution ==="
echo ""
echo "1. Build the Docker image:"
echo "   docker build -f Dockerfile.dev -t immune-me-backend:dev ."
echo ""
echo "2. Run the container:"
echo "   docker run --env-file .env -p 3333:3333 immune-me-backend:dev"
echo ""
echo "3. First run will:"
echo "   - Wait for database connection"
echo "   - Run migrations (if needed)"
echo "   - Run seeding (if database is empty)"
echo "   - Start development server"
echo ""
echo "4. Subsequent runs will:"
echo "   - Skip migrations if already applied"
echo "   - Skip seeding if data exists"
echo "   - Just start the development server"
