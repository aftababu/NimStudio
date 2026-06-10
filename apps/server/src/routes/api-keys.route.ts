import { Hono } from 'hono';
import { db, apiKeys } from '@nimstudio/db';
import { eq, desc, sql } from 'drizzle-orm';
import { encrypt } from '../utils/crypto';
import crypto from 'crypto';

const apiKeysRoute = new Hono();

apiKeysRoute.get('/', async (c) => {
  try {
    const keys = await db.select({
      id: apiKeys.id,
      projectId: apiKeys.projectId,
      isConfigured: sql<boolean>`${apiKeys.encryptedKey} IS NOT NULL`,
      createdAt: apiKeys.createdAt,
    }).from(apiKeys).orderBy(desc(apiKeys.createdAt));

    return c.json(keys);
  } catch (error: any) {
    console.error('Error fetching API keys:', error);
    return c.json({ error: error.message }, 500);
  }
});

apiKeysRoute.post('/', async (c) => {
  try {
    const { key, projectId } = await c.req.json<{ key: string, projectId: string }>();
    if (!projectId || !key) return c.json({ error: 'Missing projectId or key' }, 400);

    const { encryptedKey, iv, authTag } = encrypt(key);
    
    // UPSERT logic: check if the project already has an API key slot
    const existing = await db.select().from(apiKeys).where(eq(apiKeys.projectId, projectId));
    
    if (existing.length > 0) {
      await db.update(apiKeys)
        .set({
          encryptedKey,
          iv,
          authTag,
          updatedAt: new Date()
        })
        .where(eq(apiKeys.projectId, projectId));
        
      return c.json({ success: true, id: existing[0].id });
    } else {
      const newKey = {
        id: crypto.randomUUID(),
        projectId,
        encryptedKey,
        iv,
        authTag,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.insert(apiKeys).values(newKey);
      return c.json({ success: true, id: newKey.id });
    }
  } catch (error: any) {
    console.error('Error adding API key:', error);
    return c.json({ error: error.message }, 500);
  }
});

apiKeysRoute.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await db.delete(apiKeys).where(eq(apiKeys.id, id));
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting API key:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default apiKeysRoute;
