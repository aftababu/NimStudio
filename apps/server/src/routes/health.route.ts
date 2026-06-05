import { Hono } from 'hono';
import { checkHealth } from '../services/health.service';

const healthRoute = new Hono();

healthRoute.get('/', (c) => {
  const healthData = checkHealth();
  return c.json(healthData);
});

export default healthRoute;
