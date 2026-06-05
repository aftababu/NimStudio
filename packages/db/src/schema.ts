import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().default("default").references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  summary: text("summary"),
  summarizedCount: integer("summarized_count").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const apiKeys = sqliteTable("api_keys", {
  id: text("id").primaryKey(),
  projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  encryptedKey: text("encrypted_key").notNull(),
  iv: text("iv").notNull(),
  authTag: text("auth_tag").notNull(),
  hint: text("hint").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const models = sqliteTable("models", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  provider: text("provider").default("nvidia").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(false).notNull(),
  isSelected: integer("is_selected", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const globalRules = sqliteTable('global_rules', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),
  priority: integer('priority').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  scope: text('scope', { enum: ['always', 'new_only', 'model_specific'] }).notNull().default('always'),
  modelFilter: text('model_filter'),
  category: text('category'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});
