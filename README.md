<div align="center">

# NimStudio

**A localhost-first AI chat workspace for NVIDIA APIs.**

Organize conversations into projects, manage multiple API keys, and maintain long-running context through a hybrid memory system — all while keeping your data stored locally.

</div>

---

## Interface

<p align="center">
  <img src="https://i.postimg.cc/cCZB0FDc/localhost-3000-id-a3b39ebc-7593-4b5b-90d8-d8912b70b201.png" alt="NimStudio Interface" width="100%" />
</p>

## ✨ Features

- **NVIDIA API Integration** — Connect directly to NVIDIA-hosted models.
- **Project-Based Organization** — Separate conversations by project.
- **One API Key Per Project** — Isolate workflows and usage.
- **Hybrid Memory System** — Summary memory + recent conversation window.
- **Global Rules** — Apply custom instructions to every conversation.
- **Real-Time Streaming** — Token-by-token responses.
- **Local SQLite Storage** — Conversations, settings, and memory stay on your machine.
- **Open Source & Self-Hosted** — No telemetry. No cloud dependency.

---

## 🎯 Philosophy

Simple.

- No agents.
- No cloud sync.
- No vendor lock-in.

Just a fast local chat interface for NVIDIA models with better conversation organization and memory management.

---

## 🏗️ Architecture

```text
Project
   ↓
API Key
   ↓
Conversations
   ↓
Messages
```

Each project owns its own API key and conversation space.

---

## 🛠️ Tech Stack

| Frontend       | Backend    | Database    | AI          |
| -------------- | ---------- | ----------- | ----------- |
| Next.js        | Hono       | SQLite      | NVIDIA APIs |
| React          | TypeScript | Drizzle ORM |             |
| Zustand        |            |             |             |
| TanStack Query |            |             |             |
| Tailwind CSS   |            |             |             |

---

## 🚀 Quick Start

```bash
git clone https://github.com/aftababu/NimStudio

cd NimStudio

pnpm install

pnpm dev
```

Open:

```text
http://localhost:3000
```

---

# 📖 Usage

## 1️⃣ Add an API Key

By default, NimStudio creates a **Default** project.

Navigate to:

```text
Settings → API Keys
```

Select the project and add your NVIDIA API key.

<p align="center">
  <img src="https://i.postimg.cc/B6BzGPqR/5.png" alt="Add API Key" width="100%" />
</p>

---

## 2️⃣ Generate an NVIDIA API Key

1. Visit:

```text
https://build.nvidia.com
```

2. Create and verify your account.
3. Click your avatar (top-right).
4. Open **API Keys**.
5. Generate a new key.
6. Copy the generated key.

<p align="center">
  <img src="https://i.postimg.cc/gj66Z8nS/6.png" alt="NVIDIA API Key" width="100%" />
</p>

---

## 3️⃣ Add a Model

Navigate to:

```text
Model Selector → Add Model
```

Enter the NVIDIA model ID.

<p align="center">
  <img src="https://i.postimg.cc/qqCpLGc4/3.png" alt="Add Model" width="100%" />
</p>

---

## 4️⃣ Find a Model ID

1. Visit:

```text
https://build.nvidia.com
```

2. Open the Models page.
3. Select the model you want.
4. Locate the model identifier in the code snippet.

Example:

```text
deepseek-ai/deepseek-v4-flash
```

<p align="center">
  <img src="https://i.postimg.cc/bwLdd3ms/4.png" alt="Model ID" width="100%" />
</p>

---

## 5️⃣ Create a Project (Optional)

Navigate to:

```text
Settings → Projects
```

Create a project.

Then:

```text
Settings → API Keys
```

Assign an API key to that project.

You can switch projects from:

- Sidebar
- Project dropdown

<p align="center">
  <img src="https://i.postimg.cc/fLSxx6Pr/7.png" alt="Create Project" width="100%" />
</p>

---

## 📂 Project Structure

```text
Recent Conversations
├── Chat A
├── Chat B

Default
├── Chat 1
├── Chat 2

Research
├── Chat 1
├── Chat 2

Work
├── Chat 1
└── Chat 2
```

---

## 🔒 Local First

All application data is stored locally:

- Projects
- Conversations
- Memory Summaries
- Global Rules
- Models
- API Keys (encrypted)
- Settings

Your data remains under your control.

---

## 📜 License

MIT
