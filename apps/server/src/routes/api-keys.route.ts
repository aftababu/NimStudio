import { Hono } from 'hono';
import { db, apiKeys } from '@nimstudio/db';
import { eq, desc } from 'drizzle-orm';
import { encrypt } from '../utils/crypto';
import crypto from 'crypto';

const apiKeysRoute = new Hono();

apiKeysRoute.get('/', async (c) => {
  try {
    const keys = await db.select({
      id: apiKeys.id,
      label: apiKeys.label,
      hint: apiKeys.hint,
      projectId: apiKeys.projectId,
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
    const { label, key, projectId } = await c.req.json<{ label: string, key: string, projectId?: string }>();
    if (!label || !key) return c.json({ error: 'Missing label or key' }, 400);

    const hint = key.length > 4 ? `nvapi-***${key.slice(-4)}` : '***';
    const { encryptedKey, iv, authTag } = encrypt(key);
    
    const newKey = {
      id: crypto.randomUUID(),
      label,
      hint,
      projectId: projectId || null,
      encryptedKey,
      iv,
      authTag,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.insert(apiKeys).values(newKey);

    return c.json({ success: true, id: newKey.id });
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
