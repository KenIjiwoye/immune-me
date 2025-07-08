# BE-01: Configure PostgreSQL Database Connection

## Context
The Immunization Records Management System requires a PostgreSQL database. The backend is built with AdonisJS v6, which uses Lucid ORM for database operations. The database connection needs to be configured before creating migrations for the required tables.

## Dependencies
- AdonisJS v6 backend project (already initialized)
- PostgreSQL installed locally for development

## Requirements
1. Configure the PostgreSQL connection in the AdonisJS backend
2. Test the connection to ensure it's working properly
3. Set up environment variables for database credentials

## Code Example

```typescript
// backend/config/database.ts
import env from '#start/env'
import { defineConfig } from '@adonisjs/lucid'

export default defineConfig({
  connection: env.get('DB_CONNECTION', 'pg'),
  
  connections: {
    pg: {
      client: 'pg',
      connection: {
        host: env.get('DB_HOST', 'localhost'),
        port: env.get('DB_PORT', '5432'),
        user: env.get('DB_USER', 'postgres'),
        password: env.get('DB_PASSWORD', ''),
        database: env.get('DB_DATABASE', 'immune_me'),
      },
      migrations: {
        naturalSort: true,
        paths: ['./database/migrations']
      },
      seeders: {
        paths: ['./database/seeders']
      },
      healthCheck: true,
      debug: env.get('DB_DEBUG', false),
    }
  }
})
```

Update the `.env` file:

```
DB_CONNECTION=pg
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_DATABASE=immune_me
```

## Expected Outcome
- Database connection configured in the AdonisJS backend
- Environment variables set up for database credentials
- Connection can be tested successfully

## Testing
Run the following command to test the database connection:

```bash
cd backend
node ace db:ping
```

You should see a success message indicating the database connection is working.
