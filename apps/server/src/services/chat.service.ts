import { db, conversations, messages, apiKeys } from '@nimstudio/db';
import { eq, desc, asc, isNull } from 'drizzle-orm';
import crypto from 'crypto';
import OpenAI from 'openai';
import { decrypt } from '../utils/crypto';

export async function saveConversation(title: string = 'New Chat', projectId: string = 'default', modelId: string | null = null): Promise<string> {
  const id = crypto.randomUUID();
  await db.insert(conversations).values({
    id,
    title,
    projectId,
    modelId,
  });
  return id;
}

export async function getConversationDetails(conversationId: string) {
  const convo = await db.select({ projectId: conversations.projectId, modelId: conversations.modelId }).from(conversations).where(eq(conversations.id, conversationId)).limit(1);
  return convo[0] || null;
}

export async function getConversationProjectId(conversationId: string): Promise<string> {
  const convo = await db.select({ projectId: conversations.projectId }).from(conversations).where(eq(conversations.id, conversationId)).limit(1);
  return convo[0]?.projectId || 'default';
}

export async function getConversationMemoryState(conversationId: string) {
  const convo = await db.select({ summary: conversations.summary, summarizedCount: conversations.summarizedCount })
    .from(conversations).where(eq(conversations.id, conversationId)).limit(1);
  return convo[0] || { summary: null, summarizedCount: 0 };
}

export async function getDecryptedApiKeyForProject(projectId: string): Promise<string> {
  let keyRecord = await db.select().from(apiKeys).where(eq(apiKeys.projectId, projectId)).limit(1);
  
  if (keyRecord.length === 0) {
    keyRecord = await db.select().from(apiKeys).where(isNull(apiKeys.projectId)).limit(1);
  }

  if (keyRecord.length > 0) {
    const record = keyRecord[0];
    return decrypt(record.encryptedKey, record.iv, record.authTag);
  }

  throw new Error('No NVIDIA API key found for this project or globally. Please add one in Settings.');
}

export async function saveMessage(conversationId: string, role: 'user' | 'assistant' | 'system', content: string) {
  const id = crypto.randomUUID();
  await db.insert(messages).values({
    id,
    conversationId,
    role,
    content,
  });
}

export async function generateConversationTitle(conversationId: string, userMessageContent: string) {
  try {
    const projectId = await getConversationProjectId(conversationId);
    const apiKey = await getDecryptedApiKeyForProject(projectId);

    const openai = new OpenAI({
      apiKey,
      baseURL: 'https://integrate.api.nvidia.com/v1',
    });

    const completion = await openai.chat.completions.create({
      model: "meta/llama-3.3-70b-instruct",
      messages: [
        {
          role: "system",
          content: "You are a helpful title generator."
        },
        {
          role: "user",
          content: `Generate a concise 3-to-5 word title for a conversation that starts with this user message: [${userMessageContent}]. Return only the title text, no quotes, no explanation.`
        }
      ],
      temperature: 0.2,
      max_tokens: 20,
      stream: false,
    });

    let generatedTitle = completion.choices[0]?.message?.content?.trim() || "New Chat";
    
    generatedTitle = generatedTitle.replace(/^["']|["']$/g, '');

    await db.update(conversations)
      .set({ title: generatedTitle, updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));

    console.log(`[ChatService] Generated title for ${conversationId}: "${generatedTitle}"`);
  } catch (error) {
    console.error(`[ChatService] Failed to generate title for conversation ${conversationId}:`, error);
  }
}

export async function getRecentConversations(limitCount = 20) {
  return await db.select({
    id: conversations.id,
    title: conversations.title,
    updatedAt: conversations.updatedAt,
  })
  .from(conversations)
  .orderBy(desc(conversations.updatedAt))
  .limit(limitCount);
}

export async function renameConversation(id: string, newTitle: string) {
  await db.update(conversations)
    .set({ title: newTitle, updatedAt: new Date() })
    .where(eq(conversations.id, id));
}

export async function deleteConversation(id: string) {
  await db.delete(conversations).where(eq(conversations.id, id));
}

export async function getMessagesByConversationId(conversationId: string) {
  return await db.select({
    role: messages.role,
    content: messages.content
  })
  .from(messages)
  .where(eq(messages.conversationId, conversationId))
  .orderBy(asc(messages.createdAt));
}
