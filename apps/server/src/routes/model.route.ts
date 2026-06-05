import { Hono } from 'hono';
import { getModels, refreshModels, addModel, removeModel, selectModel } from '../services/model.service';

const modelRoute = new Hono();

modelRoute.get('/', async (c) => {
  try {
    const allModels = await getModels();
    return c.json({ models: allModels });
  } catch (error: any) {
    console.error('Error fetching models:', error);
    return c.json({ error: error.message || 'Internal Server Error' }, 500);
  }
});

modelRoute.post('/refresh', async (c) => {
  try {
    const result = await refreshModels();
    return c.json(result);
  } catch (error: any) {
    console.error('Error refreshing models:', error);
    return c.json({ error: error.message || 'Internal Server Error' }, 500);
  }
});

modelRoute.post('/', async (c) => {
  try {
    const { id } = await c.req.json<{ id: string }>();
    if (!id) return c.json({ error: 'Missing model id' }, 400);
    await addModel(id);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

modelRoute.delete('/:id', async (c) => {
  try {
    // extract id correctly handling potential slashes encoded
    const id = decodeURIComponent(c.req.param('id'));
    await removeModel(id);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

modelRoute.put('/:id/select', async (c) => {
  try {
    const id = decodeURIComponent(c.req.param('id'));
    await selectModel(id);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

modelRoute.put('/:id/rename', async (c) => {
  try {
    const id = decodeURIComponent(c.req.param('id'));
    const { name } = await c.req.json<{ name: string }>();
    if (!name) return c.json({ error: 'Missing name' }, 400);
    const { renameModel } = await import('../services/model.service');
    await renameModel(id, name);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default modelRoute;
