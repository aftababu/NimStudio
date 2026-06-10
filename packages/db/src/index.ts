import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const dbPath = path.resolve(process.cwd(), "packages/db/database.sqlite");

const dbUrl = process.env.DATABASE_URL || `file:${dbPath}`;

const client = createClient({ url: dbUrl });
export const db = drizzle(client, { schema });

export * from "./schema";
