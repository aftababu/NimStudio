import { Hono } from 'hono';
import { db, projects } from '@nimstudio/db';
import crypto from 'crypto';
import { desc } from 'drizzle-orm';

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

export default projectsRoute;
