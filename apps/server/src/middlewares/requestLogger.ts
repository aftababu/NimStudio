import { createMiddleware } from "hono/factory";

export const requestLogger = createMiddleware(async (c, next) => {
  const { method } = c.req;
  const path = new URL(c.req.url).pathname;

  console.log(`[${new Date().toISOString()}] ${method} ${path}`);

  await next();
});
