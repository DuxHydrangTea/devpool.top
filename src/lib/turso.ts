import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "../db/schema";

const url = process.env.TURSO_DATABASE_URL || "file:local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

// Create a Turso / libSQL client
export const tursoClient = createClient({
  url,
  authToken: authToken || undefined,
});

export const db = drizzle(tursoClient, { schema });
