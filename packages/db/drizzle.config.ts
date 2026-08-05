import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // schema.ts declares Supabase's auth.users table so other tables can FK
  // against it, but Supabase owns that table — only diff/manage "public".
  schemaFilter: ["public"],
});
