import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;

// If DATABASE_URL is not set (e.g. during CI build without DB), exit gracefully
if (!connectionString) {
  console.warn("[drizzle-kit] DATABASE_URL not set - skipping migration");
  process.exit(0);
}

// Ensure SSL is enabled for Render's PostgreSQL
const url = connectionString.includes("sslmode")
  ? connectionString
  : connectionString.includes("?")
    ? `${connectionString}&sslmode=require`
    : `${connectionString}?sslmode=require`;

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url,
    ssl: true,
  },
});
