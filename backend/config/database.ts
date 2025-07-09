import env from '#start/env'
import { defineConfig } from '@adonisjs/lucid'

const dbConfig = defineConfig({
  connection: env.get('DB_CONNECTION', 'pg'),
  connections: {
    pg: {
      client: 'pg',
      connection: {
        host: env.get('DB_HOST', 'localhost'),
        port: Number(env.get('DB_PORT', 5432)),
        user: env.get('DB_USER', 'postgres'),
        password: env.get('DB_PASSWORD', ''),
        database: env.get('DB_DATABASE', 'immune_me'),
      },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
      seeders: {
        paths: ['database/seeders']
      },
      debug: false,
    },
  },
})

export default dbConfig