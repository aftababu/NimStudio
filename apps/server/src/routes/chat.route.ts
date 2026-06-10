import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { fetchNvidiaChatStream, Message } from "../services/nvidia.service";
import {
  saveConversation,
  saveMessage,
  generateConversationTitle,
  getRecentConversations,
  getMessagesByConversationId,
  getConversationProjectId,
  getDecryptedApiKeyForProject,
  getConversationDetails,
  renameConversation,
  deleteConversation,
} from "../services/chat.service";
import { db, conversations } from "@nimstudio/db";
import { eq } from "drizzle-orm";
import { assemblePrompt } from "../services/prompt.service";

const chatRoute = new Hono();

chatRoute.post("/stream", async (c) => {
  const body = await c.req
    .json<{
      userMessage: string;
      model?: string;
      conversationId?: string;
      projectId?: string;
    }>()
    .catch(() => null);

  if (
    !body ||
    typeof body.userMessage !== "string" ||
    body.userMessage.trim() === ""
  ) {
    return c.json({ error: "Invalid user message" }, 400);
  }

  let { conversationId, projectId: reqProjectId, userMessage } = body;
  let isNewConversation = false;

  try {
    if (!conversationId) {
      conversationId = await saveConversation(
        "New Chat",
        reqProjectId || "default",
        body.model || null,
      );
      isNewConversation = true;
    }

    const projectId = await getConversationProjectId(conversationId);
    const apiKey = await getDecryptedApiKeyForProject(projectId);

    // Save the incoming user message to the database immediately
    await saveMessage(conversationId, "user", userMessage);

    // Dynamic Summary Window Logic
    const { getConversationMemoryState, getRecentMessagesForPrompt } =
      await import("../services/chat.service");
    const { summarizeOlderMessages } =
      await import("../services/memory.service");

    const memoryState = await getConversationMemoryState(conversationId);
    const { summary, summarizedCount } = memoryState;
    const WINDOW_SIZE = 10;

    const { unsummarizedOutsideWindow, windowedMessages: rawWindowed } =
      await getRecentMessagesForPrompt(
        conversationId,
        WINDOW_SIZE,
        summarizedCount,
      );

    // Sanitize messages to prevent API rejecting empty assistant messages
    const windowedMessages = rawWindowed.filter(
      (m: any) => typeof m.content === "string" && m.content.trim() !== "",
    );

    if (unsummarizedOutsideWindow.length >= 4) {
      // Background summarization task
      const validUnsummarized = unsummarizedOutsideWindow.filter(
        (m: any) => typeof m.content === "string" && m.content.trim() !== "",
      );
      if (validUnsummarized.length > 0) {
        summarizeOlderMessages(
          conversationId,
          apiKey,
          summary,
          validUnsummarized,
        ).catch(console.error);
      }
    }

    // Document chunk injection
    const { DocumentsService } = await import("../services/documents.service");
    const docMatches = userMessage.match(/@([a-zA-Z0-9_.-]+\.[a-zA-Z0-9]+)/g);
    let documentContext = "";

    if (docMatches && docMatches.length > 0) {
      for (const match of docMatches) {
        const filename = match.substring(1); // remove '@'
        const chunks = await DocumentsService.searchDocumentChunks(
          projectId,
          filename,
          3,
        ); // Top 3 chunks
        if (chunks.length > 0) {
          documentContext += `--- DOCUMENT CONTEXT: ${filename} ---\n${chunks.join("\n\n")}\n\n`;
        }
      }
    }

    if (documentContext) {
      // Prepend document context as a system message directly above the user's current message
      windowedMessages.push({
        role: "system",
        content: `You are answering the user's query based on the following document context. Do not mention the chunks explicitly, just use the information provided.\n\n${documentContext}`,
      } as any);
    }

    const assembledMessages = await assemblePrompt(windowedMessages, summary);
    // console.log("SYSTEM CONTENT");
    // console.log(assembledMessages.find((m) => m.role === "system")?.content);

    // console.log("ASSEMBLED MESSAGES");
    // console.dir(assembledMessages, { depth: null });
    const openaiStream = await fetchNvidiaChatStream(
      apiKey,
      assembledMessages,
      body.model,
    );
    // console.log("\n\n stream", openaiStream);
    // Explicitly disable buffering for NGINX, proxies, and browsers
    c.header("X-Accel-Buffering", "no");
    c.header("Cache-Control", "no-cache, no-transform");
    c.header("Connection", "keep-alive");
    c.header("Content-Type", "text/event-stream");

    return streamSSE(c, async (stream) => {
      // Stream the conversation ID first
      await stream.writeSSE({
        data: JSON.stringify({ type: "conversation_id", id: conversationId }),
      });

      let accumulatedAssistantMessage = "";

      for await (const chunk of openaiStream) {
        // const delta = chunk.choices?.[0]?.delta?.content;
        // console.log("DELTA:", JSON.stringify(delta));
        const content = chunk.choices[0]?.delta?.content || "";
        accumulatedAssistantMessage += content;

        if (content) {
          await stream.writeSSE({
            data: JSON.stringify(content),
          });
        }
      }

      await saveMessage(
        conversationId as string,
        "assistant",
        accumulatedAssistantMessage,
      );

      if (isNewConversation && userMessage) {
        setImmediate(() => {
          generateConversationTitle(
            conversationId as string,
            userMessage,
          ).catch(console.error);
        });
      }
    });
  } catch (error: any) {
    console.error("Error handling chat stream:", error);

    // If we created a new conversation but failed before streaming, delete it so we don't litter the DB
    if (isNewConversation && conversationId) {
      try {
        await deleteConversation(conversationId);
      } catch (delError) {
        console.error("Failed to clean up aborted conversation:", delError);
      }
    }

    const status = error.status || 500;
    const errorType = error.type || "unknown";

    return c.json(
      {
        error: error.message || "Internal Server Error",
        status: status,
        errorType: errorType,
      },
      status,
    );
  }
});

chatRoute.get("/conversations", async (c) => {
  try {
    const limit = c.req.query("limit")
      ? parseInt(c.req.query("limit") as string, 10)
      : 20;
    const history = await getRecentConversations(limit);
    return c.json({ conversations: history });
  } catch (error: any) {
    console.error("Error fetching conversations:", error);
    return c.json({ error: error.message || "Internal Server Error" }, 500);
  }
});

chatRoute.get("/conversations/:id/messages", async (c) => {
  try {
    const id = c.req.param("id");
    const { getConversationDetails } = await import("../services/chat.service");

    // Check if conversation exists first
    const details = await getConversationDetails(id);
    if (!details) {
      return c.json({ error: "Chat not found" }, 404);
    }

    const messagesList = await getMessagesByConversationId(id);
    return c.json({ messages: messagesList });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

chatRoute.get("/conversations/:id/details", async (c) => {
  try {
    // console.log("\n\n conversation id");
    const id = c.req.param("id");
    const details = await getConversationDetails(id);
    if (!details) {
      return c.json({ error: "Chat not found" }, 404);
    }
    return c.json(details);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

chatRoute.put("/conversations/:id/rename", async (c) => {
  try {
    const id = c.req.param("id");
    const { title } = await c.req.json<{ title: string }>();
    if (!title) return c.json({ error: "Missing title" }, 400);
    await renameConversation(id, title);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

chatRoute.delete("/conversations/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await deleteConversation(id);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

chatRoute.put("/conversations/:id/preferences", async (c) => {
  try {
    const id = c.req.param("id");
    const { projectId, modelId } = await c.req.json<{
      projectId?: string;
      modelId?: string;
    }>();

    const updateData: any = { updatedAt: new Date() };
    if (projectId !== undefined) updateData.projectId = projectId;
    if (modelId !== undefined) updateData.modelId = modelId;

    if (Object.keys(updateData).length > 1) {
      await db
        .update(conversations)
        .set(updateData)
        .where(eq(conversations.id, id));
    }

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default chatRoute;
