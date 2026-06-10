import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";
import path from "path";
const dbPath = path.resolve(process.cwd(), "../../packages/db/database.sqlite");

const dbUrl = process.env.DATABASE_URL || `file:${dbPath}`;

console.log("cwd =", process.cwd());
console.log("dbPath =", dbPath);
console.log("dbUrl =", dbUrl);
const client = createClient({ url: dbUrl });
export const db = drizzle(client, { schema });

export * from "./schema";
