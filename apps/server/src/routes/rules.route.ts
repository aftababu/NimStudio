import { Hono } from "hono";
import { db, globalRules } from "@nimstudio/db";
import { eq, desc, asc } from "drizzle-orm";
import crypto from "crypto";

const rulesRoute = new Hono();

rulesRoute.get("/", async (c) => {
  try {
    const rules = await db
      .select()
      .from(globalRules)
      .orderBy(desc(globalRules.priority), asc(globalRules.createdAt));
    return c.json(rules);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

rulesRoute.post("/", async (c) => {
  try {
    const { content } = await c.req.json<{ content: string }>();
    if (!content) return c.json({ error: "Content is required" }, 400);

    const allRules = await db
      .select({ priority: globalRules.priority })
      .from(globalRules);
    const minPriority =
      allRules.length > 0 ? Math.min(...allRules.map((r) => r.priority)) : 0;

    const newRule = {
      id: crypto.randomUUID(),
      content,
      priority: minPriority - 1,
      isActive: true,
      scope: "always" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(globalRules).values(newRule);
    return c.json({ success: true, rule: newRule });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

rulesRoute.patch("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates =
      await c.req.json<Partial<typeof globalRules.$inferSelect>>();

    // Remove un-updatable fields if they exist
    delete (updates as any).id;
    delete (updates as any).createdAt;

    await db
      .update(globalRules)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(globalRules.id, id));

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Batch update route for reordering/saving the full array
rulesRoute.put("/batch", async (c) => {
  try {
    const rules = await c.req.json<any[]>();
    // Assume rules array is ordered highest priority first
    const maxPriority = rules.length * 10; // spread them out

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      await db
        .update(globalRules)
        .set({
          priority: maxPriority - i * 10,
          isActive: rule.isActive,
          updatedAt: new Date(),
        })
        .where(eq(globalRules.id, rule.id));
    }

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

rulesRoute.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await db.delete(globalRules).where(eq(globalRules.id, id));
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default rulesRoute;
