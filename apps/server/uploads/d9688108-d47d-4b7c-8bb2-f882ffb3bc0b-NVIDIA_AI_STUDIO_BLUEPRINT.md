# NimStudio — Project Blueprint
### A Self-Hosted, Open-Source AI Chat Application for NVIDIA APIs

> **Opinionated architecture document.** Every decision here is made as if this is shipping as a serious open-source project. Alternatives are noted but the primary recommendation is firm.

---

## Table of Contents

1. [Project Philosophy](#1-project-philosophy)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Technology Decisions (with rationale)](#3-technology-decisions)
4. [Monorepo & Folder Structure](#4-monorepo--folder-structure)
5. [Database Schema (Drizzle + SQLite)](#5-database-schema)
6. [Backend Architecture (Hono)](#6-backend-architecture)
7. [API Route Design](#7-api-route-design)
8. [Frontend Architecture (Next.js)](#8-frontend-architecture)
9. [Streaming Architecture](#9-streaming-architecture)
10. [Prompt Assembly Pipeline](#10-prompt-assembly-pipeline)
11. [Memory System Architecture](#11-memory-system-architecture)
12. [API Key Management & Encryption](#12-api-key-management--encryption)
13. [Model Management Architecture](#13-model-management-architecture)
14. [Global Rules System](#14-global-rules-system)
15. [Future Feature Expansion Strategy](#15-future-feature-expansion-strategy)
16. [Security Architecture](#16-security-architecture)
17. [Development Roadmap](#17-development-roadmap)
18. [Risks & Tradeoffs](#18-risks--tradeoffs)
19. [Recommended Implementation Order](#19-recommended-implementation-order)

---

## 1. Project Philosophy

**NimStudio** is not a thin wrapper. It is a fully-featured, production-quality AI workspace that runs entirely on the user's machine. It treats the user as a developer who deserves a tool as powerful as the commercial alternatives — but with full data ownership.

### Core Principles

| Principle | Implementation |
|---|---|
| **Local-first** | SQLite on disk, no cloud dependency |
| **Zero trust on keys** | API keys encrypted at rest, never in env files |
| **Extensible by design** | Plugin-friendly architecture from day one |
| **Boring technology** | Node.js + SQLite + REST — proven, debuggable |
| **Clean separation** | Backend is independently testable and replaceable |
| **No vendor lock-in** | Provider abstraction layer allows other APIs later |

---

## 2. High-Level Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        USER'S MACHINE                          │
│                                                                │
│  ┌──────────────────────┐     ┌──────────────────────────────┐ │
│  │   FRONTEND           │     │   BACKEND                    │ │
│  │   Next.js :3000      │────▶│   Hono (Node.js) :3001       │ │
│  │                      │◀────│                              │ │
│  │  - React UI          │HTTP │  - REST API                  │ │
│  │  - Zustand store     │ SSE │  - Streaming (SSE)           │ │
│  │  - TanStack Query    │     │  - Service Layer             │ │
│  │  - shadcn/ui         │     │  - Provider Abstraction      │ │
│  └──────────────────────┘     └──────────────┬───────────────┘ │
│                                              │                  │
│                               ┌─────────────▼──────────────┐  │
│                               │   DATABASE                  │  │
│                               │   SQLite (better-sqlite3)   │  │
│                               │                             │  │
│                               │  - Conversations            │  │
│                               │  - Messages                 │  │
│                               │  - API Keys (encrypted)     │  │
│                               │  - Memory Entries           │  │
│                               │  - Global Rules             │  │
│                               │  - Settings                 │  │
│                               └─────────────────────────────┘  │
│                                                                │
└──────────────────────────────────────────┬─────────────────────┘
                                           │ HTTPS
                                           ▼
                              ┌────────────────────────┐
                              │   NVIDIA NIM API        │
                              │   integrate.api.nvidia  │
                              │   .com/v1               │
                              │                         │
                              │   (OpenAI-compatible)   │
                              └────────────────────────┘
```

### Request Flow (Chat Message)

```
User types message
      │
      ▼
ChatInput component
      │  POST /api/chat/stream
      ▼
Hono: /chat/stream route
      │
      ├── Validate request
      ├── Load conversation + settings
      ├── Decrypt API key
      ├── PromptService.assemble()
      │     ├── Load global rules
      │     ├── Load memory entries
      │     ├── Load conversation summary
      │     └── Load recent messages
      │
      ├── NvidiaProvider.streamChat()
      │     └── fetch() → NVIDIA API (streaming)
      │
      └── SSE Response stream back to client
            │
            ▼
      StreamingMessage component renders tokens
            │
            ▼
      On complete: save message to DB
```

---

## 3. Technology Decisions

### Why Hono as a separate server (not Next.js API routes)?

Next.js API routes run in a serverless-style function context. `better-sqlite3` is synchronous and works poorly under that model. More importantly, the backend should be independently testable, deployable, and replaceable. A clean HTTP boundary between frontend and backend is the right call for an open-source project that others will fork and extend.

**Alternative considered:** Hono mounted inside Next.js via catch-all route — rejected because it couples the deployment model.

### Why SQLite + better-sqlite3?

- Zero infrastructure: one file, no server process
- `better-sqlite3` is the fastest SQLite binding for Node.js (synchronous, uses WAL mode)
- Perfect for self-hosted single-user workloads
- Drizzle ORM gives type-safe schema + migrations without the overhead of Prisma
- Backup = `cp database.sqlite backup.sqlite`

**Alternative considered:** PostgreSQL — rejected because it requires a running server, making self-hosting harder.

### Why SSE over WebSockets for streaming?

SSE is unidirectional (server → client), which is exactly what streaming tokens requires. WebSockets add bidirectional complexity that isn't needed. SSE works natively with `EventSource`, is resumable, and Hono has first-class support for it.

### Why Zustand over Redux/Context?

Zustand has minimal boilerplate, works well alongside TanStack Query, is tiny (~1KB), and encourages sliced stores. The mental model matches what's needed: a few pieces of global state (active conversation, model selection, streaming state) that many components need to read.

### Why TanStack Query?

Server state (conversations list, messages, settings) has completely different concerns from UI state. TanStack Query handles caching, invalidation, loading states, and optimistic updates with almost no boilerplate. It pairs perfectly with Zustand (TQ for server state, Zustand for client/UI state).

---

## 4. Monorepo & Folder Structure

### Root

```
nimstudio/
├── apps/
│   ├── web/                  ← Next.js frontend
│   └── server/               ← Hono backend
├── packages/
│   ├── db/                   ← Drizzle schema, migrations, db client
│   ├── types/                ← Shared TypeScript types (API contracts)
│   └── config/               ← Shared ESLint/TS configs
├── turbo.json
├── package.json              ← pnpm workspace root
├── pnpm-workspace.yaml
├── .gitignore
└── README.md
```

### packages/db/

```
packages/db/
├── src/
│   ├── index.ts              ← exports db client + all tables
│   ├── client.ts             ← better-sqlite3 connection setup
│   ├── schema/
│   │   ├── index.ts
│   │   ├── conversations.ts
│   │   ├── messages.ts
│   │   ├── api-keys.ts
│   │   ├── settings.ts
│   │   ├── rules.ts
│   │   ├── memory.ts
│   │   └── models.ts
│   └── migrations/           ← Drizzle auto-generated
├── drizzle.config.ts
└── package.json
```

### apps/server/

```
apps/server/
├── src/
│   ├── index.ts              ← Entry: creates Hono app, starts server
│   ├── app.ts                ← Hono app factory, middleware registration
│   ├── config/
│   │   └── env.ts            ← zod-validated env schema
│   │
│   ├── routes/               ← Thin route handlers (validation + delegate)
│   │   ├── index.ts          ← Route aggregator
│   │   ├── chat.route.ts
│   │   ├── conversations.route.ts
│   │   ├── messages.route.ts
│   │   ├── models.route.ts
│   │   ├── api-keys.route.ts
│   │   ├── settings.route.ts
│   │   ├── rules.route.ts
│   │   └── memory.route.ts
│   │
│   ├── services/             ← Business logic (no DB calls here)
│   │   ├── chat.service.ts
│   │   ├── conversation.service.ts
│   │   ├── message.service.ts
│   │   ├── memory.service.ts
│   │   ├── prompt.service.ts
│   │   ├── summary.service.ts
│   │   ├── model.service.ts
│   │   ├── api-key.service.ts
│   │   └── settings.service.ts
│   │
│   ├── repositories/         ← All DB access lives here
│   │   ├── conversation.repo.ts
│   │   ├── message.repo.ts
│   │   ├── memory.repo.ts
│   │   ├── api-key.repo.ts
│   │   ├── rule.repo.ts
│   │   └── settings.repo.ts
│   │
│   ├── providers/            ← External AI API adapters
│   │   ├── base.provider.ts  ← Interface / abstract class
│   │   ├── nvidia.provider.ts
│   │   └── registry.ts       ← Provider factory
│   │
│   ├── middleware/
│   │   ├── error.middleware.ts
│   │   ├── logger.middleware.ts
│   │   └── cors.middleware.ts
│   │
│   └── utils/
│       ├── crypto.ts         ← AES-256-GCM key encryption
│       ├── tokens.ts         ← Token counting utilities
│       ├── streaming.ts      ← SSE helpers
│       └── validate.ts       ← Zod schema helpers
│
├── tsconfig.json
└── package.json
```

### apps/web/

```
apps/web/
├── src/
│   ├── app/                  ← Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx          ← Redirects to /chat
│   │   ├── chat/
│   │   │   ├── page.tsx      ← New chat / empty state
│   │   │   └── [id]/
│   │   │       └── page.tsx  ← Conversation view
│   │   └── settings/
│   │       ├── layout.tsx    ← Settings shell
│   │       ├── page.tsx      ← General settings
│   │       ├── api-keys/page.tsx
│   │       ├── models/page.tsx
│   │       ├── memory/page.tsx
│   │       └── rules/page.tsx
│   │
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── MessageItem.tsx
│   │   │   ├── MessageInput.tsx
│   │   │   ├── StreamingMessage.tsx
│   │   │   ├── MessageActions.tsx     ← Copy, edit, regenerate
│   │   │   └── EmptyChat.tsx
│   │   ├── sidebar/
│   │   │   ├── AppSidebar.tsx
│   │   │   ├── ConversationList.tsx
│   │   │   ├── ConversationItem.tsx
│   │   │   ├── ConversationSearch.tsx
│   │   │   └── NewChatButton.tsx
│   │   ├── model/
│   │   │   ├── ModelSelector.tsx
│   │   │   └── ModelBadge.tsx
│   │   ├── memory/
│   │   │   ├── MemoryModeSelector.tsx
│   │   │   └── MemoryPanel.tsx
│   │   ├── settings/
│   │   │   ├── ApiKeyForm.tsx
│   │   │   ├── ApiKeyList.tsx
│   │   │   ├── GlobalRulesEditor.tsx
│   │   │   └── ModelToggle.tsx
│   │   └── ui/               ← shadcn components live here
│   │
│   ├── stores/               ← Zustand slices
│   │   ├── index.ts          ← Combines slices
│   │   ├── chat.store.ts     ← Active conversation, streaming state
│   │   ├── ui.store.ts       ← Sidebar open, panels, etc.
│   │   └── settings.store.ts ← Local preferences
│   │
│   ├── hooks/
│   │   ├── useChat.ts        ← Send message + streaming
│   │   ├── useConversations.ts
│   │   ├── useModels.ts
│   │   ├── useApiKeys.ts
│   │   ├── useMemory.ts
│   │   └── useSettings.ts
│   │
│   ├── lib/
│   │   ├── api-client.ts     ← Typed fetch wrapper
│   │   ├── streaming.ts      ← SSE stream consumer
│   │   └── utils.ts
│   │
│   └── types/
│       └── index.ts          ← Re-exports from @nimstudio/types
│
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## 5. Database Schema

Full Drizzle schema. Every table has a rationale.

```typescript
// packages/db/src/schema/conversations.ts

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const conversations = sqliteTable('conversations', {
  id:                text('id').primaryKey(),          // nanoid
  title:             text('title').notNull(),
  modelId:           text('model_id').notNull(),       // e.g. "meta/llama-3.1-405b-instruct"
  apiKeyId:          text('api_key_id'),               // FK → api_keys.id (nullable = use default)
  memoryMode:        text('memory_mode', {
                       enum: ['none', 'normal', 'super']
                     }).notNull().default('none'),
  systemPromptOverride: text('system_prompt_override'),// per-conversation override
  tokenCount:        integer('token_count').notNull().default(0),
  isPinned:          integer('is_pinned', { mode: 'boolean' }).notNull().default(false),
  isArchived:        integer('is_archived', { mode: 'boolean' }).notNull().default(false),
  metadata:          text('metadata', { mode: 'json' }),  // extensible JSON blob
  createdAt:         integer('created_at', { mode: 'timestamp' })
                       .notNull().default(sql`(unixepoch())`),
  updatedAt:         integer('updated_at', { mode: 'timestamp' })
                       .notNull().default(sql`(unixepoch())`),
  lastMessageAt:     integer('last_message_at', { mode: 'timestamp' }),
}, (t) => ({
  lastMsgIdx:   index('conv_last_msg_idx').on(t.lastMessageAt),
  archivedIdx:  index('conv_archived_idx').on(t.isArchived),
}))

// ─────────────────────────────────────────────────────────────────────────────

// packages/db/src/schema/messages.ts

export const messages = sqliteTable('messages', {
  id:             text('id').primaryKey(),
  conversationId: text('conversation_id').notNull()
                    .references(() => conversations.id, { onDelete: 'cascade' }),
  role:           text('role', {
                    enum: ['user', 'assistant', 'system', 'tool']
                  }).notNull(),
  content:        text('content').notNull(),
  modelId:        text('model_id'),                // which model generated this
  tokensUsed:     integer('tokens_used'),
  finishReason:   text('finish_reason'),           // 'stop' | 'length' | 'error'
  isEdited:       integer('is_edited', { mode: 'boolean' }).notNull().default(false),
  parentId:       text('parent_id'),               // for branching (V2+)
  metadata:       text('metadata', { mode: 'json' }), // tool calls, attachments future
  createdAt:      integer('created_at', { mode: 'timestamp' })
                    .notNull().default(sql`(unixepoch())`),
}, (t) => ({
  convIdx:        index('msg_conv_idx').on(t.conversationId),
  createdAtIdx:   index('msg_created_idx').on(t.conversationId, t.createdAt),
}))

// ─────────────────────────────────────────────────────────────────────────────

// packages/db/src/schema/api-keys.ts

export const apiKeys = sqliteTable('api_keys', {
  id:             text('id').primaryKey(),
  name:           text('name').notNull(),           // user-given label
  keyEncrypted:   text('key_encrypted').notNull(),  // AES-256-GCM ciphertext
  keyHint:        text('key_hint'),                 // last 4 chars, unencrypted, for display
  provider:       text('provider').notNull().default('nvidia'),
  baseUrl:        text('base_url'),                 // override default provider URL
  isDefault:      integer('is_default', { mode: 'boolean' }).notNull().default(false),
  isActive:       integer('is_active', { mode: 'boolean' }).notNull().default(true),
  lastUsedAt:     integer('last_used_at', { mode: 'timestamp' }),
  usageCount:     integer('usage_count').notNull().default(0),
  createdAt:      integer('created_at', { mode: 'timestamp' })
                    .notNull().default(sql`(unixepoch())`),
  updatedAt:      integer('updated_at', { mode: 'timestamp' })
                    .notNull().default(sql`(unixepoch())`),
}, (t) => ({
  defaultIdx:     index('apikey_default_idx').on(t.isDefault),
}))

// ─────────────────────────────────────────────────────────────────────────────

// packages/db/src/schema/settings.ts

export const settings = sqliteTable('settings', {
  key:            text('key').primaryKey(),
  value:          text('value').notNull(),           // JSON-encoded value
  type:           text('type', {
                    enum: ['string', 'number', 'boolean', 'json']
                  }).notNull(),
  updatedAt:      integer('updated_at', { mode: 'timestamp' })
                    .notNull().default(sql`(unixepoch())`),
})

// Default settings seeded on first run:
// system.default_model       = "meta/llama-3.1-405b-instruct"
// system.default_memory_mode = "none"
// system.max_context_tokens  = 8192
// system.stream_enabled      = true
// system.theme               = "system"
// system.default_temperature = 0.7

// ─────────────────────────────────────────────────────────────────────────────

// packages/db/src/schema/rules.ts

export const globalRules = sqliteTable('global_rules', {
  id:             text('id').primaryKey(),
  content:        text('content').notNull(),         // the instruction text
  priority:       integer('priority').notNull().default(0),  // higher = applied first
  isActive:       integer('is_active', { mode: 'boolean' }).notNull().default(true),
  scope:          text('scope', {
                    enum: ['always', 'new_only', 'model_specific']
                  }).notNull().default('always'),
  modelFilter:    text('model_filter'),               // used when scope = 'model_specific'
  category:       text('category'),                  // 'language', 'style', 'format', etc.
  createdAt:      integer('created_at', { mode: 'timestamp' })
                    .notNull().default(sql`(unixepoch())`),
  updatedAt:      integer('updated_at', { mode: 'timestamp' })
                    .notNull().default(sql`(unixepoch())`),
}, (t) => ({
  priorityIdx:    index('rule_priority_idx').on(t.priority),
  activeIdx:      index('rule_active_idx').on(t.isActive),
}))

// ─────────────────────────────────────────────────────────────────────────────

// packages/db/src/schema/memory.ts

export const memoryEntries = sqliteTable('memory_entries', {
  id:             text('id').primaryKey(),
  conversationId: text('conversation_id')
                    .references(() => conversations.id, { onDelete: 'cascade' }),
                    // NULL = global/cross-conversation memory
  type:           text('type', {
                    enum: ['fact', 'preference', 'summary', 'entity', 'instruction']
                  }).notNull(),
  content:        text('content').notNull(),
  source:         text('source', {
                    enum: ['extracted', 'user_defined', 'inferred']
                  }).notNull().default('extracted'),
  embedding:      text('embedding', { mode: 'json' }),  // float[] — used with sqlite-vec in V2
  confidence:     integer('confidence').default(100),    // 0-100
  isActive:       integer('is_active', { mode: 'boolean' }).notNull().default(true),
  expiresAt:      integer('expires_at', { mode: 'timestamp' }),
  metadata:       text('metadata', { mode: 'json' }),
  createdAt:      integer('created_at', { mode: 'timestamp' })
                    .notNull().default(sql`(unixepoch())`),
}, (t) => ({
  convIdx:        index('mem_conv_idx').on(t.conversationId),
  typeIdx:        index('mem_type_idx').on(t.type),
  globalIdx:      index('mem_global_idx').on(t.conversationId, t.isActive),
}))

// ─────────────────────────────────────────────────────────────────────────────

// packages/db/src/schema/summaries.ts

export const conversationSummaries = sqliteTable('conversation_summaries', {
  id:                 text('id').primaryKey(),
  conversationId:     text('conversation_id').notNull()
                        .references(() => conversations.id, { onDelete: 'cascade' }),
  content:            text('content').notNull(),         // the summary text
  messageRangeStart:  integer('msg_range_start').notNull(), // first message index covered
  messageRangeEnd:    integer('msg_range_end').notNull(),   // last message index covered
  tokenCount:         integer('token_count').notNull(),
  modelUsed:          text('model_used'),                // which model generated the summary
  createdAt:          integer('created_at', { mode: 'timestamp' })
                        .notNull().default(sql`(unixepoch())`),
}, (t) => ({
  convIdx:            index('summary_conv_idx').on(t.conversationId),
}))

// ─────────────────────────────────────────────────────────────────────────────

// packages/db/src/schema/models.ts

export const models = sqliteTable('models', {
  id:             text('id').primaryKey(),           // internal id (nanoid)
  modelId:        text('model_id').notNull().unique(),// NVIDIA model string
  name:           text('name').notNull(),            // display name
  provider:       text('provider').notNull().default('nvidia'),
  contextWindow:  integer('context_window').notNull(),
  maxOutputTokens:integer('max_output_tokens'),
  supportsStreaming: integer('supports_streaming', { mode: 'boolean' }).default(true),
  supportsVision: integer('supports_vision', { mode: 'boolean' }).default(false),
  supportsTools:  integer('supports_tools', { mode: 'boolean' }).default(false),
  supportsEmbedding: integer('supports_embedding', { mode: 'boolean' }).default(false),
  isActive:       integer('is_active', { mode: 'boolean' }).notNull().default(true),
  isFeatured:     integer('is_featured', { mode: 'boolean' }).notNull().default(false),
  family:         text('family'),                    // 'llama', 'deepseek', 'qwen', etc.
  description:    text('description'),
  capabilities:   text('capabilities', { mode: 'json' }), // extensible
  sortOrder:      integer('sort_order').default(0),
  createdAt:      integer('created_at', { mode: 'timestamp' })
                    .notNull().default(sql`(unixepoch())`),
}, (t) => ({
  activeIdx:      index('model_active_idx').on(t.isActive),
}))

// ─────────────────────────────────────────────────────────────────────────────

// Future tables (design them now, implement when needed):

// documents            → id, name, type, size, path, conv_id, created_at
// document_chunks      → id, doc_id, content, chunk_index, token_count, embedding
// attachments          → id, message_id, document_id, type
// audit_log            → id, action, entity_type, entity_id, metadata, created_at
```

### Schema Relationships

```
api_keys (1) ──────────────── (0..n) conversations
                                      │
                               (1) ──────── (n) messages
                                      │
                               (1) ──────── (n) conversation_summaries
                                      │
                               (1) ──────── (n) memory_entries [scope=conversation]

memory_entries [conversationId IS NULL] = global memory (cross-conversation)

global_rules ────── (injected into all conversations based on scope)

settings ────────── (key-value store, no foreign keys)

models ──────────── (referenced by conversations.model_id, messages.model_id)
```

---

## 6. Backend Architecture

### Provider Abstraction

Every AI provider must implement the `BaseProvider` interface. This makes adding non-NVIDIA providers later a matter of writing one file.

```typescript
// apps/server/src/providers/base.provider.ts

export interface StreamChatParams {
  messages:      ChatMessage[]
  model:         string
  apiKey:        string
  baseUrl?:      string
  temperature?:  number
  maxTokens?:    number
  stream:        true
}

export interface ChatMessage {
  role:    'system' | 'user' | 'assistant'
  content: string
}

export interface BaseProvider {
  readonly name: string
  readonly defaultBaseUrl: string

  streamChat(params: StreamChatParams): Promise<ReadableStream<Uint8Array>>
  listModels(apiKey: string): Promise<ProviderModel[]>
  validateKey(apiKey: string): Promise<boolean>
}
```

```typescript
// apps/server/src/providers/nvidia.provider.ts

import type { BaseProvider, StreamChatParams } from './base.provider'

export class NvidiaProvider implements BaseProvider {
  readonly name = 'nvidia'
  readonly defaultBaseUrl = 'https://integrate.api.nvidia.com/v1'

  async streamChat(params: StreamChatParams): Promise<ReadableStream<Uint8Array>> {
    const baseUrl = params.baseUrl ?? this.defaultBaseUrl

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${params.apiKey}`,
      },
      body: JSON.stringify({
        model:       params.model,
        messages:    params.messages,
        temperature: params.temperature ?? 0.7,
        max_tokens:  params.maxTokens ?? 2048,
        stream:      true,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new NvidiaApiError(response.status, error)
    }

    if (!response.body) throw new Error('No response body from NVIDIA API')

    return response.body
  }

  async validateKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.defaultBaseUrl}/models`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      })
      return response.ok
    } catch {
      return false
    }
  }

  async listModels(apiKey: string): Promise<ProviderModel[]> {
    const response = await fetch(`${this.defaultBaseUrl}/models`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })
    if (!response.ok) throw new NvidiaApiError(response.status, 'Failed to list models')
    const data = await response.json()
    return data.data // OpenAI format: { data: Model[] }
  }
}
```

### Service Layer Pattern

Services are the heart of the application. Routes call services. Services call repositories. Services never touch HTTP context.

```typescript
// apps/server/src/services/chat.service.ts

export class ChatService {
  constructor(
    private conversationRepo: ConversationRepository,
    private messageRepo:      MessageRepository,
    private promptService:    PromptService,
    private apiKeyService:    ApiKeyService,
    private provider:         BaseProvider,
  ) {}

  async *streamResponse(params: StreamChatParams): AsyncGenerator<StreamChunk> {
    // 1. Load conversation
    const conversation = await this.conversationRepo.findById(params.conversationId)
    if (!conversation) throw new NotFoundError('Conversation not found')

    // 2. Resolve and decrypt API key
    const rawApiKey = await this.apiKeyService.getDecryptedKey(
      params.apiKeyId ?? conversation.apiKeyId
    )

    // 3. Save user message
    const userMessage = await this.messageRepo.create({
      conversationId: conversation.id,
      role: 'user',
      content: params.userMessage,
    })

    // 4. Assemble prompt
    const assembled = await this.promptService.assemble({
      conversation,
      currentMessage: params.userMessage,
    })

    // 5. Stream from provider
    const stream = await this.provider.streamChat({
      messages: assembled.messages,
      model:    conversation.modelId,
      apiKey:   rawApiKey,
      stream:   true,
    })

    // 6. Parse SSE stream, yield chunks, accumulate full response
    let fullContent = ''

    for await (const chunk of this.parseSSEStream(stream)) {
      fullContent += chunk.delta
      yield chunk
    }

    // 7. Save assistant message
    await this.messageRepo.create({
      conversationId: conversation.id,
      role: 'assistant',
      content: fullContent,
      modelId: conversation.modelId,
    })

    // 8. Update conversation metadata
    await this.conversationRepo.touchLastMessage(conversation.id)

    // 9. Async: trigger memory extraction if mode !== 'none'
    setImmediate(() => this.triggerPostProcessing(conversation, fullContent))
  }

  private async *parseSSEStream(stream: ReadableStream): AsyncGenerator<StreamChunk> {
    const reader  = stream.getReader()
    const decoder = new TextDecoder()
    let buffer    = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') return

          try {
            const parsed = JSON.parse(data)
            const delta  = parsed.choices?.[0]?.delta?.content ?? ''
            if (delta) yield { type: 'token', delta }
          } catch { /* malformed chunk, skip */ }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }
}
```

### Repository Pattern

Repositories are the only layer that touches the database. They return typed domain objects, never raw Drizzle rows.

```typescript
// apps/server/src/repositories/conversation.repo.ts

export class ConversationRepository {
  constructor(private db: Database) {}

  async findById(id: string): Promise<Conversation | null> {
    const result = this.db.prepare(
      'SELECT * FROM conversations WHERE id = ? AND is_archived = 0'
    ).get(id)
    return result ? this.mapRow(result) : null
  }

  async findAll(options: { limit?: number; offset?: number } = {}): Promise<Conversation[]> {
    return this.db.prepare(`
      SELECT * FROM conversations
      WHERE is_archived = 0
      ORDER BY COALESCE(last_message_at, created_at) DESC
      LIMIT ? OFFSET ?
    `).all(options.limit ?? 50, options.offset ?? 0).map(this.mapRow)
  }

  async search(query: string): Promise<Conversation[]> {
    // Basic FTS — upgrade to FTS5 in V1
    return this.db.prepare(`
      SELECT * FROM conversations
      WHERE title LIKE ? AND is_archived = 0
      ORDER BY last_message_at DESC
      LIMIT 20
    `).all(`%${query}%`).map(this.mapRow)
  }

  async create(data: CreateConversationInput): Promise<Conversation> {
    const id = nanoid()
    this.db.prepare(`
      INSERT INTO conversations (id, title, model_id, api_key_id, memory_mode)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, data.title, data.modelId, data.apiKeyId ?? null, data.memoryMode ?? 'none')
    return this.findById(id)!
  }

  async touchLastMessage(id: string): Promise<void> {
    this.db.prepare(`
      UPDATE conversations SET last_message_at = unixepoch(), updated_at = unixepoch()
      WHERE id = ?
    `).run(id)
  }

  private mapRow(row: any): Conversation {
    return { ...row, metadata: row.metadata ? JSON.parse(row.metadata) : null }
  }
}
```

### Error Handling

Typed error hierarchy. Middleware catches and maps to HTTP status codes.

```typescript
// apps/server/src/utils/errors.ts

export class AppError extends Error {
  constructor(
    public message:    string,
    public statusCode: number = 500,
    public code:       string = 'INTERNAL_ERROR'
  ) { super(message) }
}

export class NotFoundError     extends AppError { constructor(m: string) { super(m, 404, 'NOT_FOUND') } }
export class ValidationError   extends AppError { constructor(m: string) { super(m, 400, 'VALIDATION_ERROR') } }
export class AuthError         extends AppError { constructor(m: string) { super(m, 401, 'AUTH_ERROR') } }
export class NvidiaApiError    extends AppError {
  constructor(status: number, message: string) {
    super(`NVIDIA API error: ${message}`, status >= 500 ? 502 : status, 'PROVIDER_ERROR')
  }
}

// middleware/error.middleware.ts
app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json({ error: err.message, code: err.code }, err.statusCode)
  }
  console.error('[Unhandled]', err)
  return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500)
})
```

---

## 7. API Route Design

All routes prefixed with `/api`. Versioning skipped in MVP (add `/v1` prefix in V1).

### Chat

```
POST   /api/chat/stream
  Body: { conversationId, userMessage, apiKeyId? }
  Response: text/event-stream (SSE)
  Events: data: {"type":"token","delta":"..."}\n\n
          data: {"type":"done","messageId":"..."}\n\n
          data: {"type":"error","message":"..."}\n\n

POST   /api/chat/stop
  Body: { conversationId }
  Response: { ok: true }

POST   /api/chat/regenerate
  Body: { conversationId, messageId }
  Response: text/event-stream
```

### Conversations

```
GET    /api/conversations          → list (limit, offset, search)
POST   /api/conversations          → create (title?, modelId, memoryMode?)
GET    /api/conversations/:id      → get with messages
PATCH  /api/conversations/:id      → update (title, modelId, memoryMode, isPinned)
DELETE /api/conversations/:id      → soft-delete (archive)

GET    /api/conversations/:id/messages
PATCH  /api/conversations/:id/messages/:msgId  → edit message content
```

### Models

```
GET    /api/models                 → list active models
POST   /api/models/refresh         → fetch from NVIDIA API + sync
PATCH  /api/models/:id             → toggle isActive, update sort order
```

### API Keys

```
GET    /api/api-keys               → list (key_hint shown, never full key)
POST   /api/api-keys               → create + encrypt + store
POST   /api/api-keys/validate      → test key against NVIDIA API
PATCH  /api/api-keys/:id           → update name, set default
DELETE /api/api-keys/:id           → delete
```

### Settings

```
GET    /api/settings               → all settings as flat object
PATCH  /api/settings               → bulk update
GET    /api/settings/:key          → single value
```

### Rules

```
GET    /api/rules                  → list active rules ordered by priority
POST   /api/rules                  → create
PATCH  /api/rules/:id              → update content, priority, isActive
DELETE /api/rules/:id              → delete
PATCH  /api/rules/reorder          → update priorities in bulk
```

### Memory

```
GET    /api/memory                 → list global memory entries
GET    /api/memory?conversationId= → conversation-scoped entries
POST   /api/memory                 → manually add memory entry
PATCH  /api/memory/:id             → update, deactivate
DELETE /api/memory/:id             → delete entry
POST   /api/memory/extract         → trigger extraction from conversation
```

### Response Shape (all non-streaming endpoints)

```typescript
// Success
{ data: T, meta?: { total: number, limit: number, offset: number } }

// Error
{ error: string, code: string, details?: unknown }
```

---

## 8. Frontend Architecture

### State Split: Zustand vs TanStack Query

| Concern | Tool | Why |
|---|---|---|
| Active conversation ID | Zustand | UI state, no server round-trip |
| Streaming state (tokens, isStreaming) | Zustand | Real-time UI updates |
| Sidebar open/closed | Zustand | Pure UI |
| Conversations list | TanStack Query | Server data, needs cache invalidation |
| Messages for a conversation | TanStack Query | Server data |
| Models list | TanStack Query | Changes rarely, long cache |
| API keys list | TanStack Query | Server data |
| Settings | TanStack Query | Small, rarely changes |

### Zustand Store Design

```typescript
// stores/chat.store.ts

interface ChatStore {
  // State
  activeConversationId:  string | null
  streamingMessageId:    string | null
  streamingContent:      string
  isStreaming:           boolean
  abortController:       AbortController | null

  // Actions
  setActiveConversation: (id: string | null) => void
  startStreaming:        (conversationId: string) => void
  appendToken:           (token: string) => void
  stopStreaming:         () => void
  abortStream:           () => void
}

// stores/ui.store.ts

interface UiStore {
  sidebarOpen:           boolean
  selectedMemoryMode:    MemoryMode
  editingMessageId:      string | null
  modelSelectorOpen:     boolean

  toggleSidebar:         () => void
  setMemoryMode:         (mode: MemoryMode) => void
  setEditingMessage:     (id: string | null) => void
}
```

### Streaming Hook

The `useChat` hook is the most critical piece of frontend code. It manages the SSE connection, Zustand updates, and TanStack Query invalidation.

```typescript
// hooks/useChat.ts

export function useChat(conversationId: string) {
  const { startStreaming, appendToken, stopStreaming } = useChatStore()
  const queryClient = useQueryClient()

  const sendMessage = useCallback(async (content: string) => {
    startStreaming(conversationId)

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, userMessage: content }),
        signal: abortController.signal,
      })

      if (!response.body) throw new Error('No stream')

      const reader  = response.body.getReader()
      const decoder = new TextDecoder()
      let   buffer  = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const json = JSON.parse(line.slice(6))

          if (json.type === 'token') appendToken(json.delta)
          if (json.type === 'done') {
            // Invalidate messages query so the saved message loads
            queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })
            queryClient.invalidateQueries({ queryKey: ['conversations'] })
          }
        }
      }
    } finally {
      stopStreaming()
    }
  }, [conversationId])

  return { sendMessage }
}
```

### Component Hierarchy

```
AppLayout
├── AppSidebar
│   ├── NewChatButton
│   ├── ConversationSearch
│   └── ConversationList
│       └── ConversationItem (× N)
│
└── ChatWindow
    ├── ChatHeader
    │   ├── ModelSelector
    │   ├── MemoryModeSelector
    │   └── ConversationActions (rename, delete, pin)
    │
    ├── MessageList
    │   └── MessageItem (× N)
    │       ├── MessageContent (markdown rendered)
    │       └── MessageActions (copy, edit, regenerate)
    │   └── StreamingMessage (live token display)
    │
    └── MessageInput
        ├── Textarea (auto-resize)
        ├── SendButton / StopButton
        └── InputActions (attach file V1, memory toggle)
```

### Markdown Rendering

Use `react-markdown` with `remark-gfm` and `rehype-highlight` (or `rehype-shiki` for better syntax highlighting).

```typescript
// components/chat/MessageContent.tsx

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

export function MessageContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        code({ node, inline, className, children }) {
          if (inline) return <code className={className}>{children}</code>
          return (
            <CodeBlock className={className}>
              {String(children).replace(/\n$/, '')}
            </CodeBlock>
          )
        }
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
```

---

## 9. Streaming Architecture

```
NVIDIA API                 Backend (Hono)              Frontend (React)
    │                           │                           │
    │  SSE stream                │                           │
    │◀──────────────────────────│                           │
    │  data: {"choices":[...]}   │                           │
    │                           │  SSE re-stream             │
    │                           │───────────────────────────▶│
    │                           │  data: {"type":"token"...} │
    │                           │                           │ appendToken()
    │                           │                           │ re-render
```

### Hono SSE Route

```typescript
// routes/chat.route.ts

chat.post('/stream', async (c) => {
  const body = await c.req.json()
  const { conversationId, userMessage } = chatStreamSchema.parse(body)

  // Set SSE headers
  c.header('Content-Type',  'text/event-stream')
  c.header('Cache-Control', 'no-cache')
  c.header('Connection',    'keep-alive')
  c.header('X-Accel-Buffering', 'no')  // important for nginx proxies

  return streamSSE(c, async (stream) => {
    try {
      const chatService = c.get('chatService')

      for await (const chunk of chatService.streamResponse({ conversationId, userMessage })) {
        await stream.writeSSE({
          data: JSON.stringify(chunk),
        })
      }

      await stream.writeSSE({ data: JSON.stringify({ type: 'done' }) })
    } catch (err) {
      await stream.writeSSE({
        data: JSON.stringify({ type: 'error', message: String(err) })
      })
    }
  })
})
```

### Abort / Stop Generation

```typescript
// Client side
const abortController = new AbortController()

fetch('/api/chat/stream', { signal: abortController.signal, ... })

// Stop button calls:
abortController.abort()

// Server side: when client disconnects, the SSE stream closes.
// Hono's streamSSE detects the closed connection.
// The provider fetch is NOT auto-cancelled — add explicit cleanup:

const providerStream = await provider.streamChat(...)
c.req.raw.signal.addEventListener('abort', () => {
  providerStream.cancel()
})
```

---

## 10. Prompt Assembly Pipeline

This is the most architecturally important service. It must be correct, deterministic, and testable.

### Assembled Message Structure

```
[SYSTEM MESSAGE]
  ├── Base system prompt
  ├── Global rules (active, sorted by priority)
  └── Memory context (if mode !== 'none')

[CONVERSATION HISTORY]
  ├── Summary message (if context was compressed)
  └── Recent N messages (sliding window)

[CURRENT USER MESSAGE]
```

### Token Budget Strategy

Total budget = model's context window - `max_tokens` (reserved for response)

```
Available tokens = context_window - max_output_tokens - safety_buffer(128)

Allocation:
  - System prompt + rules:     ~600 tokens (hard)
  - Memory context:            ~800 tokens (soft cap)
  - Conversation summary:      ~400 tokens (when present)
  - Recent messages:           remaining budget (fill this last)
```

### Implementation

```typescript
// services/prompt.service.ts

export class PromptService {
  constructor(
    private ruleRepo:    RuleRepository,
    private memoryRepo:  MemoryRepository,
    private messageRepo: MessageRepository,
    private summaryRepo: SummaryRepository,
    private settings:    SettingsService,
  ) {}

  async assemble(ctx: PromptContext): Promise<AssembledPrompt> {
    const model      = MODELS[ctx.conversation.modelId]
    const maxContext = model.contextWindow
    const maxOutput  = (await this.settings.get('system.max_output_tokens')) as number ?? 2048
    const budget     = maxContext - maxOutput - 128

    // --- 1. Base system prompt ---
    const systemBase = ctx.conversation.systemPromptOverride
      ?? await this.settings.get('system.default_system_prompt') as string
      ?? DEFAULT_SYSTEM_PROMPT

    // --- 2. Global rules ---
    const rules = await this.ruleRepo.findActive(ctx.conversation.modelId)
    const rulesText = rules.length
      ? `\n\n## Instructions\n${rules.map(r => `- ${r.content}`).join('\n')}`
      : ''

    // --- 3. Memory context ---
    let memoryText = ''
    if (ctx.conversation.memoryMode !== 'none') {
      const entries = await this.memoryRepo.findRelevant({
        conversationId: ctx.conversation.id,
        mode:           ctx.conversation.memoryMode,
        query:          ctx.currentMessage,   // used for semantic search in Super mode
        limit:          20,
      })
      if (entries.length) {
        memoryText = `\n\n## What I know about you\n${entries.map(e => `- ${e.content}`).join('\n')}`
      }
    }

    const systemMessage: ChatMessage = {
      role:    'system',
      content: systemBase + rulesText + memoryText,
    }

    const systemTokens  = estimateTokens(systemMessage.content)
    let   remainingBudget = budget - systemTokens

    // --- 4. Conversation summary (if exists) ---
    const summary = await this.summaryRepo.findLatest(ctx.conversation.id)
    const summaryMessages: ChatMessage[] = []

    if (summary && ctx.conversation.memoryMode !== 'none') {
      const summaryMsg: ChatMessage = {
        role:    'system',
        content: `[Earlier conversation summary]\n${summary.content}`,
      }
      remainingBudget -= estimateTokens(summaryMsg.content)
      summaryMessages.push(summaryMsg)
    }

    // --- 5. Recent messages (sliding window) ---
    const allMessages = await this.messageRepo.findByConversation(ctx.conversation.id)
    const startIndex  = summary ? summary.messageRangeEnd + 1 : 0
    const recentMessages = this.fitMessagesInBudget(
      allMessages.slice(startIndex),
      remainingBudget
    )

    // --- 6. Current user message ---
    const currentMessage: ChatMessage = {
      role:    'user',
      content: ctx.currentMessage,
    }

    return {
      messages: [
        systemMessage,
        ...summaryMessages,
        ...recentMessages,
        currentMessage,
      ],
      tokenEstimate: budget - remainingBudget + estimateTokens(ctx.currentMessage),
    }
  }

  private fitMessagesInBudget(messages: Message[], budget: number): ChatMessage[] {
    // Take from the END (most recent), work backwards until budget exhausted
    const result: ChatMessage[] = []
    let used = 0

    for (let i = messages.length - 1; i >= 0; i--) {
      const tokens = estimateTokens(messages[i].content)
      if (used + tokens > budget) break
      result.unshift({ role: messages[i].role as any, content: messages[i].content })
      used += tokens
    }

    return result
  }
}

// Token estimation (cheap, good enough for budget planning)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5)  // ~3.5 chars per token for English
}
```

---

## 11. Memory System Architecture

### Mode: None

Pass the raw sliding window of messages. No processing. Cheapest and most predictable.

### Mode: Normal (Conversation-level)

**Trigger:** When a conversation exceeds `SUMMARY_THRESHOLD` tokens (default: 60% of context window).

**Process:**
1. Detect that recent messages are approaching the budget limit
2. Take the oldest N messages (not yet in any summary)
3. Call NVIDIA API with a summarization prompt
4. Store result in `conversation_summaries`
5. Future prompt assembly uses summary + only the newest messages

```typescript
// services/summary.service.ts

const SUMMARIZE_PROMPT = `
Summarize the conversation below. Be concise but preserve:
- Key decisions and conclusions
- Any code, commands, or specific outputs mentioned
- User preferences expressed
- Unresolved questions

Format as bullet points. Do not add commentary.

Conversation to summarize:
`

async function summarizeConversation(
  conversationId: string,
  messageRange: Message[],
  provider: BaseProvider,
  apiKey: string,
): Promise<string> {
  // Non-streaming call for summaries
  const content = messageRange.map(m => `${m.role}: ${m.content}`).join('\n\n')
  // ... call provider, return summary text
}
```

### Mode: Super (Cross-conversation semantic memory)

This is the most complex feature. Architecture:

**Extraction Phase** (runs async after each response):
- Use a small NVIDIA model (or the same model) to extract structured facts
- Facts are categorized: `preference`, `fact`, `entity`, `instruction`

```typescript
const EXTRACT_PROMPT = `
Extract memorable facts about the user from this conversation excerpt.
Return JSON array of objects with fields: type, content.
Types: preference, fact, entity.
Only extract clear, stated facts. Not inferences.

Example output:
[
  {"type":"preference","content":"User prefers TypeScript over JavaScript"},
  {"type":"fact","content":"User works at a startup building a fintech app"},
  {"type":"entity","content":"User's project is called PayStream"}
]

Conversation:
`
```

**Retrieval Phase** (during prompt assembly):

- V1: Simple keyword/recency retrieval from `memory_entries`
- V2: Vector embeddings using NVIDIA's embedding models + `sqlite-vec`

```typescript
// V2 vector search (when sqlite-vec is available)

async function findRelevantMemories(
  query: string,
  conversationId: string,
  limit: number = 10,
): Promise<MemoryEntry[]> {
  // Get embedding for current query
  const queryEmbedding = await getEmbedding(query)

  // sqlite-vec cosine similarity search
  return db.prepare(`
    SELECT m.*, vec_distance_cosine(m.embedding, ?) AS distance
    FROM memory_entries m
    WHERE m.is_active = 1
      AND (m.conversation_id = ? OR m.conversation_id IS NULL)
    ORDER BY distance ASC
    LIMIT ?
  `).all(JSON.stringify(queryEmbedding), conversationId, limit)
}
```

**Embedding Model:** `nvidia/nv-embedqa-e5-v5` (1024-dim, available via NVIDIA API)

**Deduplication:** Before storing a new memory entry, check cosine similarity against existing entries. If similarity > 0.92, update the existing entry instead of creating a new one.

### Memory Management UI

- List of all memory entries (filterable by type and scope)
- Toggle individual entries active/inactive
- Manually add facts ("Claude always knows I use Arch Linux")
- Export/import memory as JSON
- Bulk delete

---

## 12. API Key Management & Encryption

### Threat Model (self-hosted)

The threat is: a malicious script or process on the same machine reading the SQLite database file. We are **not** protecting against an attacker with root access — that is outside scope.

### Encryption Scheme

```typescript
// utils/crypto.ts

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'

// Master key is derived once and stored in a separate file outside the DB
// Location: ~/.nimstudio/master.key (created on first run, gitignored)
// This separates the encryption key from the encrypted data

export function encryptApiKey(plaintext: string, masterKey: Buffer): string {
  const iv         = randomBytes(16)
  const cipher     = createCipheriv(ALGORITHM, masterKey, iv)
  const encrypted  = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag    = cipher.getAuthTag()

  // Format: iv(32hex) + authTag(32hex) + ciphertext(hex)
  return iv.toString('hex') + authTag.toString('hex') + encrypted.toString('hex')
}

export function decryptApiKey(ciphertext: string, masterKey: Buffer): string {
  const iv         = Buffer.from(ciphertext.slice(0, 32), 'hex')
  const authTag    = Buffer.from(ciphertext.slice(32, 64), 'hex')
  const encrypted  = Buffer.from(ciphertext.slice(64), 'hex')

  const decipher   = createDecipheriv(ALGORITHM, masterKey, iv)
  decipher.setAuthTag(authTag)

  return decipher.update(encrypted) + decipher.final('utf8')
}

// On first run: generate and persist master key
export function initMasterKey(): Buffer {
  const keyPath = path.join(os.homedir(), '.nimstudio', 'master.key')

  if (fs.existsSync(keyPath)) {
    return Buffer.from(fs.readFileSync(keyPath, 'utf8'), 'hex')
  }

  fs.mkdirSync(path.dirname(keyPath), { recursive: true })
  const key = randomBytes(32)
  fs.writeFileSync(keyPath, key.toString('hex'), { mode: 0o600 }) // chmod 600
  return key
}
```

### Display Strategy

```
API Key stored:    nvapi-xK9...mQ2P (full key, AES-256 encrypted)
API Key displayed: nvapi-***...mQ2P (only last 4 chars via key_hint column)
```

### Key Rotation Architecture (V2)

```typescript
interface KeyRotationPolicy {
  conversationId: string
  keyIds:         string[]    // Ordered list of keys to try
  strategy:       'sequential' | 'round-robin' | 'random'
  onFailover:     'next_key' | 'fail'
}
```

When a 429 or 401 error is received during streaming, the service can automatically retry with the next key in the rotation policy.

---

## 13. Model Management Architecture

### Built-in Model Registry

The app ships with a curated list of NVIDIA-hosted models seeded into the `models` table on first run. Users can toggle visibility.

```typescript
// config/models.ts — the seed data

export const NVIDIA_MODELS: ModelSeed[] = [
  {
    modelId:        'meta/llama-3.1-405b-instruct',
    name:           'Llama 3.1 405B',
    family:         'llama',
    contextWindow:  128000,
    maxOutputTokens: 4096,
    isFeatured:     true,
    description:    "Meta's largest open-source model. Best for complex reasoning.",
    capabilities:   { reasoning: 5, coding: 4, creative: 4 },
  },
  {
    modelId:        'meta/llama-3.3-70b-instruct',
    name:           'Llama 3.3 70B',
    family:         'llama',
    contextWindow:  128000,
    maxOutputTokens: 4096,
    isFeatured:     true,
    description:    'Excellent balance of speed and intelligence.',
    capabilities:   { reasoning: 4, coding: 4, creative: 4 },
  },
  {
    modelId:        'deepseek-ai/deepseek-r1',
    name:           'DeepSeek R1',
    family:         'deepseek',
    contextWindow:  128000,
    maxOutputTokens: 8192,
    isFeatured:     true,
    description:    'State-of-the-art reasoning model. Best for math and code.',
    capabilities:   { reasoning: 5, coding: 5, creative: 3 },
  },
  {
    modelId:        'deepseek-ai/deepseek-v3',
    name:           'DeepSeek V3',
    family:         'deepseek',
    contextWindow:  128000,
    maxOutputTokens: 8192,
    description:    'Fast, capable general-purpose model.',
    capabilities:   { reasoning: 4, coding: 5, creative: 4 },
  },
  {
    modelId:        'qwen/qwen2.5-72b-instruct',
    name:           'Qwen 2.5 72B',
    family:         'qwen',
    contextWindow:  131072,
    maxOutputTokens: 8192,
    description:    'Alibaba\'s flagship model. Strong multilingual capabilities.',
    capabilities:   { reasoning: 4, coding: 4, creative: 4, multilingual: 5 },
  },
  {
    modelId:        'moonshot-ai/moonshot-v1-8k',
    name:           'Kimi (Moonshot)',
    family:         'moonshot',
    contextWindow:  8192,
    maxOutputTokens: 4096,
    description:    'Moonshot\'s efficient chat model.',
    capabilities:   { reasoning: 3, coding: 3, creative: 4 },
  },
  {
    modelId:        'microsoft/phi-4',
    name:           'Phi-4',
    family:         'phi',
    contextWindow:  16384,
    maxOutputTokens: 4096,
    description:    'Microsoft\'s compact but surprisingly capable model.',
    capabilities:   { reasoning: 4, coding: 4, creative: 3 },
  },
  {
    modelId:        'mistralai/mixtral-8x22b-instruct-v0.1',
    name:           'Mixtral 8×22B',
    family:         'mistral',
    contextWindow:  65536,
    maxOutputTokens: 4096,
    description:    'Mixture-of-experts. Fast with high capacity.',
    capabilities:   { reasoning: 4, coding: 4, creative: 4 },
  },
  // Embedding models (not chat, but tracked)
  {
    modelId:           'nvidia/nv-embedqa-e5-v5',
    name:              'NVIDIA Embed E5 v5',
    family:            'nvidia-embed',
    contextWindow:     512,
    supportsEmbedding: true,
    supportsStreaming:  false,
    description:       'Used for Super Memory embeddings.',
  },
]
```

### Dynamic Model Sync

```
POST /api/models/refresh
  → Fetches /v1/models from NVIDIA API
  → For each returned model:
    - If in DB: update last_synced_at, keep user's isActive setting
    - If new: insert with isActive = false (user must enable)
  → Returns diff: { added[], updated[], unchanged[] }
```

### Model Selector UI

```
┌─────────────────────────────────────┐
│ 🔍 Search models...                 │
├─────────────────────────────────────┤
│ ⭐ FEATURED                         │
│  ○ Llama 3.1 405B    128K  ★★★★★   │
│  ● DeepSeek R1       128K  ★★★★★   │ ← selected
│  ○ Llama 3.3 70B     128K  ★★★★    │
│                                     │
│ ALL MODELS                          │
│  ○ Qwen 2.5 72B      131K          │
│  ○ Phi-4              16K          │
│  ...                                │
└─────────────────────────────────────┘
```

---

## 14. Global Rules System

### Schema (already defined above, recap the UX)

Rules are injected into the system prompt before every request, ordered by `priority` (ascending — lower number = higher priority, runs first).

### Prompt Injection Format

```
You are a helpful AI assistant.

## Instructions
- Always respond in English, regardless of the language used in the question
- When writing code, prefer TypeScript over JavaScript
- Be concise. Avoid unnecessary preamble or filler phrases
- When explaining code, go step-by-step

[Memory context injected here if applicable]
```

### Rule Scoping Options

| Scope | Behavior |
|---|---|
| `always` | Applied to every conversation |
| `new_only` | Only applied to conversations started after the rule was created |
| `model_specific` | Only applied when `conversation.model_id LIKE model_filter` |

### Rule Management UI

```
┌─────────────────────────────────────────────────────┐
│ Global Rules                              [+ Add]   │
├─────────────────────────────────────────────────────┤
│ ↕ [✓] Always respond in English          priority:1 │
│ ↕ [✓] Prefer TypeScript                  priority:2 │
│ ↕ [ ] Use formal tone           [disabled]          │
│ ↕ [✓] Be concise                          priority:3│
└─────────────────────────────────────────────────────┘
```

Rules are drag-reorderable. Toggling the checkbox calls `PATCH /api/rules/:id` with `{ isActive }`.

---

## 15. Future Feature Expansion Strategy

The key architectural decision for extensibility: **keep the provider layer pure and the message schema extensible.**

The `messages.metadata` JSON column is the expansion point for everything that isn't plain text content.

### Phase 1 Future: File Uploads

```typescript
// messages.metadata shape for file attachments:
{
  "attachments": [
    {
      "id":       "doc_abc123",
      "type":     "pdf",
      "name":     "design-spec.pdf",
      "size":     245120,
      "chunkIds": ["chunk_1", "chunk_2", ...]  // populated after ingestion
    }
  ]
}
```

**Architecture:**
- Files stored in `~/.nimstudio/uploads/` (not in DB)
- PDFs: use `pdf-parse` for text extraction
- Images: pass as base64 in NVIDIA vision API call (when model supports vision)
- `documents` + `document_chunks` tables added

### Phase 2 Future: RAG

```
User uploads PDF
       │
       ▼
DocumentIngestionService
       │
       ├── Extract text (pdf-parse or unstructured)
       ├── Chunk (RecursiveTextSplitter, ~512 tokens, 20% overlap)
       ├── Get embeddings (nvidia/nv-embedqa-e5-v5)
       └── Store in document_chunks (with embedding)
       │
       ▼
At query time:
  ├── Embed user's question
  ├── Vector search in document_chunks (sqlite-vec)
  ├── Retrieve top-K chunks
  └── Inject into prompt as [Document Context]
```

### Phase 3 Future: MCP Support

MCP (Model Context Protocol) integration should be designed as a server-side plugin system:

```typescript
// Future: packages/mcp-client/

interface McpPlugin {
  name:        string
  description: string
  tools:       McpTool[]
  connect():   Promise<void>
  call(tool: string, args: any): Promise<any>
}
```

MCP tools get injected into the chat request as NVIDIA API tool definitions. The `messages.metadata` column captures tool call history.

### Phase 4 Future: Image Generation

NVIDIA supports image generation models (SDXL, FLUX, etc.) via separate endpoints. These are non-streaming and return image URLs.

```
POST /api/generate-image
Body: { prompt, model, size, n }
Response: { imageUrl, revisedPrompt }
```

Store generated images locally, reference in `messages.metadata`.

### Plugin Architecture (V3)

Design now, implement later:

```typescript
interface NimStudioPlugin {
  name:    string
  version: string

  // Lifecycle hooks
  onInstall?():                Promise<void>
  onPromptAssembly?(ctx: PromptContext): Promise<PromptContext>
  onMessageComplete?(msg: Message): Promise<void>

  // UI extension points (React component registration)
  sidebarWidgets?:    React.ComponentType[]
  messageDecorators?: React.ComponentType<{ message: Message }>[]
  settingsPanels?:    { label: string, component: React.ComponentType }[]
}
```

---

## 16. Security Architecture

### API Key Security Summary

| Layer | Mechanism |
|---|---|
| Storage | AES-256-GCM encrypted in SQLite |
| Master key | `~/.nimstudio/master.key` (chmod 600, gitignored) |
| Display | Last 4 chars only (`key_hint`) |
| Transport | HTTP localhost only (no TLS needed; external = user's responsibility) |
| Memory | Decrypted key held in memory only during API call, not cached |

### SQLite Security

```typescript
// Enable WAL mode + restrict permissions on init
db.pragma('journal_mode = WAL')
db.pragma('synchronous = NORMAL')
db.pragma('foreign_keys = ON')

// Limit file permissions
fs.chmodSync(DB_PATH, 0o600)
```

### CORS Policy

Since both apps run on localhost, CORS is restricted to the frontend origin:

```typescript
app.use('/*', cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowHeaders: ['Content-Type'],
}))
```

### Input Validation

All route inputs are validated with Zod before reaching service layer:

```typescript
const chatStreamSchema = z.object({
  conversationId: z.string().min(1).max(50),
  userMessage:    z.string().min(1).max(100_000),
  apiKeyId:       z.string().optional(),
})
```

### Export/Import

```typescript
// Export: full database snapshot
GET /api/export
  → Returns gzipped JSON containing all conversations, messages, rules, settings
  → API keys are exported encrypted (with a warning)
  → Memory entries included

// Import
POST /api/import
  Body: { data: ExportData, mergeStrategy: 'replace' | 'merge' }
```

---

## 17. Development Roadmap

### MVP (Week 1-3): The core works

**Goal:** A working NVIDIA chat app. Nothing more.

- [ ] Monorepo scaffold (Turborepo + pnpm)
- [ ] Database schema + migrations (all tables, even unused ones)
- [ ] Hono server with CORS, error handling
- [ ] NVIDIA provider (streamChat only)
- [ ] `POST /api/chat/stream` — working SSE streaming
- [ ] `GET/POST/DELETE /api/conversations`
- [ ] `GET /api/conversations/:id/messages`
- [ ] `GET/POST/PATCH/DELETE /api/api-keys`
- [ ] `GET /api/models` (seeded list, no dynamic sync)
- [ ] Next.js app with working chat UI
- [ ] Sidebar with conversation list
- [ ] Streaming message rendering
- [ ] Model selector (from seeded list)
- [ ] API key manager UI (add, delete, set default)
- [ ] Markdown + syntax highlighting
- [ ] Copy message button
- [ ] Auto-scroll
- [ ] Stop generation
- [ ] Auto-generated titles (call NVIDIA with short prompt after first response)

**Excluded from MVP:** Memory, global rules, search, message editing, settings page

---

### V1 (Week 4-6): Polish + Memory basics

**Goal:** A product you'd actually want to use daily.

- [ ] Full-text search on conversations (SQLite FTS5)
- [ ] Message editing + regeneration
- [ ] Global rules system (full UI)
- [ ] Settings page (theme, default model, default memory mode, system prompt)
- [ ] Normal memory mode (conversation summaries)
- [ ] Conversation-level API key assignment
- [ ] Dynamic model sync (`POST /api/models/refresh`)
- [ ] Conversation pinning and archiving
- [ ] Token count display
- [ ] Export/Import (JSON)
- [ ] Dark/light/system theme
- [ ] Keyboard shortcuts (Cmd+K for new chat, Cmd+/ for search)
- [ ] Error states (network failure, invalid key, model unavailable)
- [ ] Onboarding flow (first-run wizard: add API key → select model → start chatting)

---

### V2 (Month 2-3): Intelligence + Files

**Goal:** The memory and RAG features that differentiate NimStudio.

- [ ] Super Memory mode (vector embeddings + sqlite-vec)
- [ ] Memory extraction pipeline
- [ ] Memory management UI (view, edit, delete facts)
- [ ] File uploads (images, text files)
- [ ] PDF ingestion + RAG
- [ ] Vision support (for models that support it)
- [ ] API key rotation policies
- [ ] Conversation branching (message tree)
- [ ] System prompt templates
- [ ] Prompt library (save/reuse prompts)
- [ ] Model capability indicators in UI
- [ ] Performance: lazy-load message history, virtual scroll

---

### V3 (Month 4+): Power user features

**Goal:** The best NVIDIA AI client available.

- [ ] MCP (Model Context Protocol) support
- [ ] Image generation models
- [ ] YouTube transcript summarization
- [ ] Audio input (NVIDIA audio models)
- [ ] Plugin architecture (third-party extensions)
- [ ] Multi-user mode (local password protection)
- [ ] CLI mode (nimstudio ask "..." for terminal use)
- [ ] API key analytics (cost estimation, usage per conversation)
- [ ] Automated backup
- [ ] Mobile-responsive layout

---

## 18. Risks & Tradeoffs

### Decision: Separate Hono server vs Next.js API routes

| | Separate Hono | Next.js API Routes |
|---|---|---|
| SQLite compatibility | ✅ Full Node.js | ⚠️ Serverless edge issues |
| Bundle complexity | ⚠️ Two processes | ✅ One process |
| Testability | ✅ Independent | ⚠️ Coupled to Next |
| Future flexibility | ✅ Swap frontend freely | ❌ Locked to Next |
| Developer experience | ✅ Clear boundary | ✅ Simpler setup |

**Decision: Separate Hono. Verdict: Correct.** The two-process overhead is negligible locally. The testability and architecture benefits are significant.

---

### Risk: SQLite concurrency under heavy load

SQLite in WAL mode handles concurrent reads well but sequential writes. For a single-user local app, this is a non-issue. If NimStudio ever adds multi-user support, this is the first thing to revisit.

**Mitigation in schema:** All writes are kept minimal (no write-heavy operations on the hot path). Summaries and memory extraction run on `setImmediate` (async, after the response is sent).

---

### Risk: NVIDIA API changes

NVIDIA's NIM API is OpenAI-compatible but model availability and endpoints change.

**Mitigation:** The provider abstraction means any breaking change is isolated to `nvidia.provider.ts`. Model IDs are not hardcoded in application logic (only in seed data). The `POST /api/models/refresh` endpoint keeps the model list current.

---

### Risk: Encryption key loss

If `~/.nimstudio/master.key` is deleted, all stored API keys become unrecoverable.

**Mitigation:**
- First-run wizard warns clearly that this file must be backed up
- Export function exports the encrypted keys with a note
- V2: optional passphrase-derived key as alternative

---

### Tradeoff: No real-time multi-tab sync

If the user opens NimStudio in two browser tabs, the Zustand stores won't sync between them. This is acceptable for V1 (the common case is one tab). V2 can add BroadcastChannel-based store synchronization.

---

### Tradeoff: Token estimation is approximate

`estimateTokens(text)` uses a character-based heuristic, not a real tokenizer. This means the sliding window may occasionally exceed the model's context limit.

**Mitigation:** The safety buffer (128 tokens) and 60% summary threshold provide a comfortable margin. V2 can add `tiktoken` for exact counts.

---

## 19. Recommended Implementation Order

Follow this exact order. Each step produces something testable.

```
Step 1  — Monorepo scaffold
          pnpm + Turborepo + tsconfig + prettier + eslint

Step 2  — packages/db
          Schema, migrations, db client export
          Test: run migrations, verify tables

Step 3  — apps/server foundation
          Hono app, CORS, error middleware, health endpoint
          Test: curl http://localhost:3001/health

Step 4  — API key repository + service + route
          Add/list/delete keys, encryption working
          Test: add a key, verify it appears encrypted in DB, list shows hint only

Step 5  — NVIDIA provider
          streamChat implementation, validateKey
          Test: manually call streamChat with a real key, see tokens

Step 6  — Conversation + message repositories
          CRUD, sliding window query
          Test: create conversation, add messages, retrieve

Step 7  — Prompt service
          Assemble prompt from rules + memory + messages
          Test: unit test with mock data, verify message order and token budget

Step 8  — Chat service + /chat/stream route
          End-to-end: message → prompt → NVIDIA → SSE out
          Test: curl the endpoint, see SSE tokens

Step 9  — Next.js app scaffold
          Layout, sidebar shell, empty state

Step 10 — API client + conversation list
          TanStack Query fetching conversations from backend

Step 11 — Chat UI: MessageList, MessageItem, StreamingMessage
          Hardcode a conversation ID, render messages

Step 12 — useChat hook + MessageInput
          Send a real message, see it stream in the browser

Step 13 — Model selector
          Read from /api/models, switch mid-conversation

Step 14 — API key management UI
          Add/delete keys, set default — fully working settings flow

Step 15 — Auto-title generation
          After first message, generate title async

Step 16 — Conversation CRUD UI
          New chat, rename, delete, conversation list with search

Step 17 — Polish: markdown rendering, copy button, stop button, auto-scroll
          This is MVP complete. Ship to GitHub.

Step 18 — Global rules UI + injection
Step 19 — Settings page
Step 20 — Normal memory (summarization)
          This is V1.
```

---

## Appendix: Suggested Project Name

**NimStudio** — NVIDIA NIM + Studio. Clean, memorable, accurate. The name signals it's a workspace (Studio) built around NIM APIs. Domain-friendly. GitHub-friendly.

Alternative: **Astra** (NVIDIA constellation theme), **Vertex** (clean, tech-adjacent), **NimChat** (simpler, less distinctive).

---

## Appendix: Key Dependencies

```json
{
  "apps/server": {
    "hono":              "^4.x",
    "@hono/node-server": "^1.x",
    "better-sqlite3":    "^9.x",
    "drizzle-orm":       "^0.30.x",
    "nanoid":            "^5.x",
    "zod":               "^3.x"
  },
  "apps/web": {
    "next":              "^15.x",
    "react":             "^19.x",
    "zustand":           "^4.x",
    "@tanstack/react-query": "^5.x",
    "react-markdown":    "^9.x",
    "remark-gfm":        "^4.x",
    "rehype-highlight":  "^7.x",
    "tailwindcss":       "^3.x"
  },
  "packages/db": {
    "drizzle-orm":       "^0.30.x",
    "drizzle-kit":       "^0.20.x",
    "better-sqlite3":    "^9.x"
  },
  "devDependencies": {
    "turbo":             "^2.x",
    "typescript":        "^5.x",
    "vitest":            "^1.x"
  }
}
```

---

*Document version: 1.0 — Generated as part of NimStudio initial architecture planning.*
*Update this document as architectural decisions evolve. This is a living spec.*
