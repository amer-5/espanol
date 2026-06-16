import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../../db/schema";

// Lazy singleton — only instantiated when DATABASE_URL is set
let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    const sql = neon(url);
    _db = drizzle(sql, { schema });
  }
  return _db;
}
