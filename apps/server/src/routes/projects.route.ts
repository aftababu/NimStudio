import { Hono } from 'hono';
import { db, projects } from '@nimstudio/db';
import crypto from 'crypto';
import { desc, eq } from 'drizzle-orm';

const projectsRoute = new Hono();

projectsRoute.get('/', async (c) => {
  try {
    const allProjects = await db.select().from(projects).orderBy(desc(projects.createdAt));
    return c.json(allProjects);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

projectsRoute.post('/', async (c) => {
  try {
    const { name } = await c.req.json<{ name: string }>();
    if (!name) return c.json({ error: 'Project name is required' }, 400);

    const id = crypto.randomUUID();
    const newProject = {
      id,
      name,
      createdAt: new Date(),
    };

    await db.insert(projects).values(newProject);
    return c.json({ success: true, project: newProject });
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'Project name must be unique' }, 409);
    }
    return c.json({ error: error.message }, 500);
  }
});

projectsRoute.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    if (id === 'default') {
      return c.json({ error: 'Cannot delete the Default project' }, 403);
    }
    
    const { conversations, messages, apiKeys, documents, documentChunks } = await import('@nimstudio/db');
    const { inArray } = await import('drizzle-orm');

    // Delete API Keys
    await db.delete(apiKeys).where(eq(apiKeys.projectId, id));

    // Delete Documents and their chunks
    const projectDocs = await db.select({ id: documents.id }).from(documents).where(eq(documents.projectId, id));
    if (projectDocs.length > 0) {
      const docIds = projectDocs.map(d => d.id);
      await db.delete(documentChunks).where(inArray(documentChunks.documentId, docIds));
      await db.delete(documents).where(eq(documents.projectId, id));
    }

    // Delete Conversations and their messages
    const projectConversations = await db.select({ id: conversations.id }).from(conversations).where(eq(conversations.projectId, id));
    if (projectConversations.length > 0) {
      const convIds = projectConversations.map(c => c.id);
      await db.delete(messages).where(inArray(messages.conversationId, convIds));
      await db.delete(conversations).where(eq(conversations.projectId, id));
    }

    await db.delete(projects).where(eq(projects.id, id));
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default projectsRoute;
