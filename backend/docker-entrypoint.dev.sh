#!/bin/sh
set -e

echo "🚀 Starting ImmuneMe Development Environment..."

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
timeout=30
while ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" > /dev/null 2>&1; do
    timeout=$((timeout - 1))
    if [ $timeout -le 0 ]; then
        echo "❌ Database connection timeout"
        exit 1
    fi
    echo "  Waiting for database... ($timeout seconds left)"
    sleep 1
done
echo "✅ Database is ready!"

# Function to check if a table exists
table_exists() {
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_DATABASE" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$1');" | xargs
}

# Function to check if we need migrations
needs_migration() {
    if [ "$(table_exists adonis_schema)" = "f" ]; then
        echo "true"
        return
    fi
    
    MIGRATION_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_DATABASE" -t -c "SELECT COUNT(*) FROM adonis_schema;" | xargs)
    FILE_COUNT=$(ls -1 database/migrations/*.ts 2>/dev/null | wc -l)
    
    if [ "$MIGRATION_COUNT" -lt "$FILE_COUNT" ]; then
        echo "true"
    else
        echo "false"
    fi
}

# Function to check if we need seeding
needs_seeding() {
    if [ "$(table_exists users)" = "f" ]; then
        echo "false"  # Don't seed if users table doesn't exist
        return
    fi
    
    USER_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_DATABASE" -t -c "SELECT COUNT(*) FROM users;" | xargs)
    if [ "$USER_COUNT" -eq 0 ]; then
        echo "true"
    else
        echo "false"
    fi
}

# Run migrations if needed
if [ "$(needs_migration)" = "true" ]; then
    echo "📊 Running database migrations..."
    node ace migration:run || {
        echo "❌ Migration failed, but continuing..."
    }
    echo "✅ Migrations completed!"
else
    echo "✅ All migrations are up to date"
fi

# Run seeding if needed
if [ "$(needs_seeding)" = "true" ]; then
    echo "🌱 Running database seeders..."
    node ace db:seed || {
        echo "❌ Seeding failed, but continuing..."
    }
    echo "✅ Seeding completed!"
else
    echo "✅ Database already contains data, skipping seeding"
fi

# Start the development server
echo "🎯 Starting development server with hot reload..."
exec node ace serve --watch
