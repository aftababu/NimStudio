import { serve } from "@hono/node-server";
import app from "./app";
import { db, projects, apiKeys, models, globalRules } from "@nimstudio/db";
import { count, eq } from "drizzle-orm";
import crypto from "crypto";

async function initSystemState() {
  try {
    const projCount = await db.select({ value: count() }).from(projects);
    if (projCount[0].value === 0) {
      await db.insert(projects).values({
        id: "default",
        name: "Default",
        createdAt: new Date(),
      });
      await db.insert(apiKeys).values({
        id: crypto.randomUUID(),
        projectId: "default",
        encryptedKey: null,
        iv: null,
        authTag: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const existingModel = await db.select().from(models).where(eq(models.id, "deepseek-ai/deepseek-v4-flash"));
      if (existingModel.length === 0) {
        await db.insert(models).values({
          id: "deepseek-ai/deepseek-v4-flash",
          name: "DeepSeek V4 Flash",
          provider: "nvidia",
          isActive: true,
          isSelected: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        await db.update(models).set({ isSelected: true, isActive: true }).where(eq(models.id, "deepseek-ai/deepseek-v4-flash"));
      }

      const coreRuleText = `You are NimStudio Core.

Your primary goal is to provide clear, accurate, and efficient responses.

NimStudio uses NVIDIA free-tier APIs with limited output tokens. Therefore:

* Be concise and information-dense.
* Answer the user's request directly.
* Avoid unnecessary introductions, conclusions, and filler text.
* Do not repeat information.
* Prefer bullet points over long paragraphs.
* Keep explanations focused on the user's question.
* For coding tasks, provide the implementation first.
* Only elaborate when explicitly requested.
* Use the minimum number of tokens required to provide a complete and correct answer.

Every token has value. Optimize for clarity, usefulness, and efficiency.`;

      await db.insert(globalRules).values({
        id: crypto.randomUUID(),
        content: coreRuleText,
        priority: 100,
        isActive: true,
        scope: "always",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log("System state initialized with Default project, model, and core rule.");
    }
  } catch (err) {
    console.error("Failed to initialize system state:", err);
  }
}

const port = 3001;

initSystemState().then(() => {
  serve({
    fetch: app.fetch,
    port,
  });
});
