import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
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
const directory = path.join(process.cwd(), ".data");
const filename = path.join(directory, "rabt.json");
// A single-process queue and atomic rename prevent lost updates and partial writes.
const globalStore = globalThis as typeof globalThis & { rabtQueue?: Promise<unknown> };
export function transaction<T>(operation: (db: Database) => T | Promise<T>): Promise<T> {
  const pending = (globalStore.rabtQueue ?? Promise.resolve()).then(async () => {
    await mkdir(directory, { recursive: true });
    let db: Database;
    try { db = JSON.parse(await readFile(filename, "utf8")); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      db = { users: [], sessions: [], listings: [], orders: [], messages: [], attempts: {} };
    }
    db.sessions = db.sessions.filter((session) => session.expires > Date.now());
    db.attempts = Object.fromEntries(Object.entries(db.attempts).filter(([, item]) => item.reset > Date.now()));
    const result = await operation(db);
    await writeFile(`${filename}.tmp`, JSON.stringify(db, null, 2), { mode: 0o600 });
    await rename(`${filename}.tmp`, filename);
    return result;
  });
  globalStore.rabtQueue = pending.catch(() => {});
  return pending;
}
