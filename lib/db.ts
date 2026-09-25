import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const globalForDb = globalThis as unknown as { sql?: ReturnType<typeof postgres> };
export const sql = globalForDb.sql ?? postgres(connectionString, {
  ssl: connectionString.includes("localhost") ? false : "require",
  max: 5,
  idle_timeout: 20,
  connect_timeout: 10,
});

if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;
