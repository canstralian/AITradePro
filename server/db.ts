import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { drizzle as sqliteDrizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import ws from 'ws';
import * as pgSchema from '../shared/schema';
import * as sqliteSchema from '../shared/schema-sqlite';
import { logger } from './utils/logger';

neonConfig.webSocketConstructor = ws;

let db: ReturnType<typeof drizzle> | ReturnType<typeof sqliteDrizzle>;
let pool: Pool | null = null;
let sqlite: Database.Database | null = null;

// Initialize database connection with fallback
function initializeDatabase() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    logger.warn('DATABASE_URL not set, using SQLite fallback for development');

    // Use SQLite as fallback for development
    sqlite = new Database(':memory:');
    db = sqliteDrizzle(sqlite, { schema: sqliteSchema });

    logger.info('Connected to in-memory SQLite database');
    return db;
  }

  if (
    databaseUrl.startsWith('sqlite:') ||
    databaseUrl.endsWith('.db') ||
    databaseUrl === ':memory:'
  ) {
    // SQLite connection
    const dbPath = databaseUrl.replace('sqlite:', '') || ':memory:';
    sqlite = new Database(dbPath);
    db = sqliteDrizzle(sqlite, { schema: sqliteSchema });

    logger.info(`Connected to SQLite database: ${dbPath}`);
    return db;
  }

  // PostgreSQL/Neon connection
  try {
    pool = new Pool({ connectionString: databaseUrl });
    db = drizzle({ client: pool, schema: pgSchema });

    logger.info('Connected to PostgreSQL database');
    return db;
  } catch (error) {
    logger.error('Failed to connect to PostgreSQL, falling back to SQLite', {
      error,
    });

    // Fallback to SQLite
    sqlite = new Database(':memory:');
    db = sqliteDrizzle(sqlite, { schema: sqliteSchema });

    logger.info('Connected to SQLite fallback database');
    return db;
  }
}

// Lazy initialization
let dbInstance:
  | ReturnType<typeof drizzle>
  | ReturnType<typeof sqliteDrizzle>
  | null = null;

export function getDatabase() {
  if (!dbInstance) {
    dbInstance = initializeDatabase();
  }
  return dbInstance;
}

export { pool, sqlite };

// For backward compatibility
export const database = getDatabase();

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down database connections...');

  if (pool) {
    pool.end();
    logger.info('PostgreSQL connection pool closed');
  }

  if (sqlite) {
    sqlite.close();
    logger.info('SQLite connection closed');
  }

  process.exit(0);
});
