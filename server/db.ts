import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// Allow running without database for UI development
const MOCK_DB_MODE = !process.env.DATABASE_URL || process.env.MOCK_DB === "true";

if (MOCK_DB_MODE) {
  console.log("⚠️  Running in MOCK DATABASE mode - data won't persist");
}

// Create pool only if we have a DATABASE_URL
export const pool = MOCK_DB_MODE 
  ? null as any 
  : new Pool({ connectionString: process.env.DATABASE_URL });

export const db = MOCK_DB_MODE 
  ? null as any 
  : drizzle(pool, { schema });

export const isMockMode = MOCK_DB_MODE;
