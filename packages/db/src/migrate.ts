import { drizzle } from "drizzle-orm/node-postgres";
import { migrate as migrateNodePg } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { resolveFromRepoRoot } from "./paths";
import * as schema from "./schema";

const migrationsFolder = resolveFromRepoRoot("./packages/db/drizzle");

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }
  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });
  await migrateNodePg(db, { migrationsFolder });
  await pool.end();

  console.log("Migrations applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
