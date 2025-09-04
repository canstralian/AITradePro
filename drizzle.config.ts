import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL || 'sqlite:./dev.db';

// Determine if we're using SQLite or PostgreSQL
const isSQLite = databaseUrl.startsWith('sqlite:') || databaseUrl.endsWith('.db') || databaseUrl === ':memory:';

export default defineConfig({
  out: "./migrations",
  schema: isSQLite ? "./shared/schema-sqlite.ts" : "./shared/schema.ts",
  dialect: isSQLite ? "sqlite" : "postgresql",
  dbCredentials: isSQLite 
    ? { url: databaseUrl.replace('sqlite:', '') || './dev.db' }
    : { url: databaseUrl },
});
