# **NimStudio 🌌**

**A Self-Hosted, Open-Source AI Workspace for NVIDIA Models**

NimStudio is not a simple wrapper or a generic chatbot clone. It is a fully-featured, production-quality AI workspace that runs entirely on your local machine. Built for developers, researchers, and AI power users, NimStudio provides a premium interface for interacting with NVIDIA-hosted AI models (and others) using your own API keys—with complete data ownership and zero cloud lock-in.

## **✨ Core Features**

- **Bring-Your-Own-Key (BYOK):** No subscription fees. Add your own NVIDIA NIM API keys.
- **Zero-Trust Security:** API keys are AES-256-GCM encrypted at rest inside your local SQLite database. They are never stored in plain text .env files.
- **Hybrid Summary-Window Memory:** A highly optimized memory architecture that saves tokens and costs. It combines a strict sliding window for recent messages with asynchronous background summarization for long-term context retention.
- **Dynamic Model Registry:** Automatically syncs with NVIDIA APIs to fetch and provide the latest available models (e.g., DeepSeek R1, Llama 3.1).
- **Global Rules Engine:** Inject highly customizable, priority-based system prompts and behavioral rules into every conversation.
- **Local-First Architecture:** Everything runs locally via SQLite. Complete privacy and offline management of your conversation history.
- **Premium Developer UX:** Features a dark-first, highly opinionated "workstation" design language, complete with markdown rendering, syntax highlighting, and a responsive command-palette-style input.

## **🛠 Tech Stack**

NimStudio is built as a highly scalable monorepo, cleanly separating the client, server, and data layers.

- **Workspace:** [Turborepo](https://turbo.build/) \+ pnpm
- **Frontend (apps/web):** [Next.js 16](https://nextjs.org/) (App Router), React, Tailwind CSS, shadcn/ui.
- **Frontend State:** Zustand (client UI state) \+ TanStack Query (server state & caching).
- **Backend (apps/server):** [Hono](https://hono.dev/) (Node.js) for high-performance, independent REST routing and Server-Sent Events (SSE) streaming.
- **Database (packages/db):** SQLite (better-sqlite3) for fast, synchronous local data storage, managed via [Drizzle ORM](https://orm.drizzle.team/).

## **🏗 Architecture Overview**

NimStudio follows a strict architectural boundary to ensure extensibility:

1. **Frontend (Next.js):** Handles the UI and user interactions. Sends lightweight, strictly typed requests (e.g., { conversationId, userMessage }) to the backend. It does _not_ manage conversation history arrays to prevent network bloat.
2. **Backend (Hono):** Intercepts requests, manages the SQLite database, and handles the heavy lifting. It dynamically constructs the context payload using the **Prompt Assembly Pipeline** before dispatching the request to the AI provider.
3. **Provider Layer:** Abstracted so that while NVIDIA NIM is the primary target, adding local models (Ollama) or other cloud providers later is as simple as implementing a new interface class.

### **The Hybrid Summary-Window Memory**

NimStudio completely reinvents local chat memory. Instead of blindly sending your entire chat history back and forth until the context window breaks:

- **Short-Term Window:** Only the last \~10 messages are sent raw to maintain exact formatting and immediate context.
- **Long-Term Buffer:** As older messages fall out of the sliding window, a detached background worker quietly summarizes them using a faster, cheaper model. This rolling summary is injected directly into the system prompt, keeping token usage flat while maintaining infinite memory depth.

## **🚀 Getting Started**

### **Prerequisites**

- Node.js (v20+)
- pnpm (v11+)

### **Installation**

1. **Clone the repository:**
   git clone \[https://github.com/aftababu/NimStudio.git\](https://github.com/aftababu/NimStudio.git)
   cd NimStudio

2. **Install dependencies:**
   pnpm install

3. **Initialize the Database:**
   Push the Drizzle schema to create your local database.sqlite file.
   cd packages/db
   pnpm run db:push

4. **Start the Development Servers:**
   From the root of the monorepo, start both the Next.js frontend and the Hono backend.
   pnpm run dev

5. **Access the UI:**
   Open [http://localhost:3000](http://localhost:3000) in your browser.
   _(Note: The Hono backend runs independently on http://localhost:3001)_

### **First Run Configuration**

1. Go to **Settings \> API Keys** and add your NVIDIA API key.
2. Go to the main chat interface, click the **Model Selector**, and refresh the model list.
3. Start chatting\!

## **🤝 Contributing**

NimStudio is an open-source project. We welcome contributions, especially in expanding the **Provider Abstraction** layer (e.g., adding Anthropic, OpenAI, or Ollama support) or enhancing the UI components.

Please read the NVIDIA_AI_STUDIO_BLUEPRINT.md file in the root directory before contributing to ensure your PR aligns with the core architectural philosophy.

## **📝 License**

[MIT License](http://docs.google.com/LICENSE)
