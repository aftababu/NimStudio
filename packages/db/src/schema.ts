import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().default("default").references(() => projects.id, { onDelete: "cascade" }),
  modelId: text("model_id").references(() => models.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  summary: text("summary"),
  summarizedCount: integer("summarized_count").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => ({
  projectIdx: index("conversations_project_idx").on(table.projectId),
}));

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => ({
  conversationIdx: index("messages_conversation_idx").on(table.conversationId),
}));

export const apiKeys = sqliteTable("api_keys", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().unique().references(() => projects.id, { onDelete: "cascade" }),
  encryptedKey: text("encrypted_key"),
  iv: text("iv"),
  authTag: text("auth_tag"),
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

export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().default('default').references(() => projects.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  fileType: text('file_type').notNull(),
  markdownContent: text('markdown_content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const documentChunks = sqliteTable('document_chunks', {
  id: text('id').primaryKey(),
  documentId: text('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  chunkIndex: integer('chunk_index').notNull(),
  content: text('content').notNull(),
  // Placeholder for embeddings, storing a JSON array string since libSQL has limited native vector type support right now
  embedding: text('embedding'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  documentIdx: index("document_chunks_document_idx").on(table.documentId),
}));
