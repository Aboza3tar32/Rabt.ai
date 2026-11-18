import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import type { DemoProfile } from "@/types/demo-auth";
import type { LocalListing } from "@/types/marketplace";
import type { Order } from "@/types/orders";

export type Preferences = { favorites: string[]; cart: Record<string, number>; compare: string[] };
export type Database = {
  users: { profile: DemoProfile; passwordHash: string; consentAt: string; demo?: boolean; preferences?: Preferences }[];
  sessions: { hash: string; ownerId: string | null; expires: number; preferences: Preferences }[];
  listings: LocalListing[];
  orders: Order[];
  messages: { id: string; name: string; email: string; message: string; createdAt: string }[];
  attempts: Record<string, { count: number; reset: number }>;
};

const initialDatabase = (): Database => ({
  users: [], sessions: [], listings: [], orders: [], messages: [], attempts: {},
});
function prune(db: Database) {
  const now = Date.now();
  db.sessions = db.sessions.filter((session) => session.expires > now);
  db.attempts = Object.fromEntries(Object.entries(db.attempts).filter(([, item]) => item.reset > now));
}

const directory = path.join(process.cwd(), ".data");
const filename = path.join(directory, "rabt.json");
const globalStore = globalThis as typeof globalThis & {
  rabtQueue?: Promise<unknown>;
  rabtPool?: Pool;
  rabtInitialized?: Promise<void>;
};

function databasePool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required on Render");
  if (!globalStore.rabtPool) {
    globalStore.rabtPool = new Pool({ connectionString, max: 5 });
    globalStore.rabtPool.on("error", error => console.error("Database pool error:", error));
  }
  return globalStore.rabtPool;
}
async function ensureTable(pool: Pool): Promise<void> {
  if (!globalStore.rabtInitialized) {
    globalStore.rabtInitialized = (async () => {
      await pool.query("CREATE TABLE IF NOT EXISTS rabt_state (id integer PRIMARY KEY CHECK (id = 1), data jsonb NOT NULL)");
      await pool.query("INSERT INTO rabt_state (id, data) VALUES (1, $1::jsonb) ON CONFLICT (id) DO NOTHING", [JSON.stringify(initialDatabase())]);
    })().catch(error => {
      globalStore.rabtInitialized = undefined;
      throw error;
    });
  }
  await globalStore.rabtInitialized;
}
async function postgresTransaction<T>(operation: (db: Database) => T | Promise<T>): Promise<T> {
  const pool = databasePool();
  await ensureTable(pool);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{ data: Database }>("SELECT data FROM rabt_state WHERE id = 1 FOR UPDATE");
    const db = result.rows[0]?.data;
    if (!db) throw new Error("Database state row is missing");
    prune(db);
    const value = await operation(db);
    await client.query("UPDATE rabt_state SET data = $1::jsonb WHERE id = 1", [JSON.stringify(db)]);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
async function localTransaction<T>(operation: (db: Database) => T | Promise<T>): Promise<T> {
  await mkdir(directory, { recursive: true });
  let db: Database;
  try {
    db = JSON.parse(await readFile(filename, "utf8")) as Database;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    db = initialDatabase();
  }
  prune(db);
  const result = await operation(db);
  await writeFile(`${filename}.tmp`, JSON.stringify(db, null, 2), { mode: 0o600 });
  await rename(`${filename}.tmp`, filename);
  return result;
}
export function transaction<T>(operation: (db: Database) => T | Promise<T>): Promise<T> {
  if (process.env.DATABASE_URL) return postgresTransaction(operation);
  if (process.env.RENDER) return Promise.reject(new Error("DATABASE_URL must be configured on Render"));
  const pending = (globalStore.rabtQueue ?? Promise.resolve()).then(() => localTransaction(operation));
  globalStore.rabtQueue = pending.catch(() => {});
  return pending;
}
