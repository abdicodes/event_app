import fs from "node:fs";
import postgres from "postgres";
import { requireEnv } from "./env.mjs";

const databaseUrl = requireEnv("DATABASE_URL");
const sql = postgres(databaseUrl, { ssl: databaseUrl.includes("localhost") ? false : "require", max:1 });
const schema = fs.readFileSync(new URL("./schema.sql", import.meta.url), "utf8");
await sql.unsafe(schema);
await sql.end();
console.log("Database schema is ready.");
