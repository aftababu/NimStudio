import { Hono } from 'hono';
import { db, globalRules } from '@nimstudio/db';
import { eq } from 'drizzle-orm';

const settingsRoute = new Hono();

settingsRoute.get('/general', async (c) => {
  try {
    const rules = await db.select().from(globalRules).where(eq(globalRules.id, 'system_prompt'));
    const systemPrompt = rules.length > 0 ? rules[0].content : '';

    return c.json({
      systemPrompt,
      theme: 'dark'
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

settingsRoute.post('/general', async (c) => {
  try {
    const { systemPrompt } = await c.req.json<{ systemPrompt: string }>();

    if (systemPrompt && systemPrompt.trim() !== '') {
      const existing = await db.select().from(globalRules).where(eq(globalRules.id, 'system_prompt'));
      if (existing.length > 0) {
        await db.update(globalRules)
          .set({ content: systemPrompt.trim(), updatedAt: new Date() })
          .where(eq(globalRules.id, 'system_prompt'));
      } else {
        await db.insert(globalRules).values({
          id: 'system_prompt',
          content: systemPrompt.trim(),
          priority: 9999,
          isActive: true,
          scope: 'always',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    } else {
      await db.delete(globalRules).where(eq(globalRules.id, 'system_prompt'));
    }

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default settingsRoute;
