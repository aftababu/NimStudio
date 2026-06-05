import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

const dbUrl = process.env.DATABASE_URL || 'file:/home/aftababu/Documents/projects/my_next/NimStudio/packages/db/database.sqlite';
const client = createClient({ url: dbUrl });
export const db = drizzle(client, { schema });

export * from './schema';
