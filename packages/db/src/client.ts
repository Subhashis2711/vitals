import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Db = ReturnType<typeof drizzle<typeof schema>>;

let dbInstance: Db | undefined;
let poolInstance: Pool | undefined;

// Always Postgres (Supabase) now — see DATABASE_URL in .env.example. Use the
// project's "Transaction pooler" connection string; that pooler (Supavisor)
// is what makes this safe to run against a host that opens many short-lived
// connections (e.g. Render's free tier).
function buildDb(): { db: Db; pool: Pool } {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }
  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });
  return { db, pool };
}

export function getDb(): Db {
  if (!dbInstance) {
    const { db, pool } = buildDb();
    dbInstance = db;
    poolInstance = pool;
  }
  return dbInstance;
}

export async function closeDb(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end();
    dbInstance = undefined;
    poolInstance = undefined;
  }
}
