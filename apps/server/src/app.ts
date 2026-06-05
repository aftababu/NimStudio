import { Hono } from "hono";
import { cors } from "hono/cors";
import healthRoute from "./routes/health.route";
import chatRoute from "./routes/chat.route";
import modelRoute from "./routes/model.route";
import apiKeysRoute from "./routes/api-keys.route";
import rulesRoute from "./routes/rules.route";
import projectsRoute from "./routes/projects.route";
import "dotenv/config";
import { requestLogger } from "./middlewares/requestLogger";

const app = new Hono();

// Global middleware
app.use(
  "/*",
  cors({
    origin: "http://localhost:3000",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  }),
);
app.use("*", requestLogger);

// Routes
app.route("/health", healthRoute);
app.route("/api/chat", chatRoute);
app.route("/api/models", modelRoute);
app.route("/api/api-keys", apiKeysRoute);
app.route("/api/rules", rulesRoute);
app.route("/api/projects", projectsRoute);

export default app;
