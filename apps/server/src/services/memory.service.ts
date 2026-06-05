import { db, conversations } from '@nimstudio/db';
import { eq } from 'drizzle-orm';
import OpenAI from 'openai';
import { Message } from './nvidia.service';

export async function summarizeOlderMessages(
  conversationId: string,
  apiKey: string,
  currentSummary: string | null,
  newMessages: Message[]
) {
  if (!newMessages || newMessages.length === 0) return;

  try {
    const openai = new OpenAI({
      apiKey,
      baseURL: 'https://integrate.api.nvidia.com/v1',
    });

    const messagesText = newMessages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');

    let promptContent = `You are an AI tasked with maintaining a concise running summary of a conversation.\n`;
    if (currentSummary) {
      promptContent += `\nHere is the current summary:\n<summary>\n${currentSummary}\n</summary>\n\nHere are the new messages to incorporate:\n<messages>\n${messagesText}\n</messages>\n\nPlease generate a concise, updated summary that captures the essential context, facts, and user intent. Do not include introductory phrases. Just provide the raw summary text.`;
    } else {
      promptContent += `\nHere are the first few messages of a new conversation:\n<messages>\n${messagesText}\n</messages>\n\nPlease generate a concise summary that captures the essential context, facts, and user intent. Do not include introductory phrases. Just provide the raw summary text.`;
    }

    const response = await openai.chat.completions.create({
      model: "meta/llama-3.3-70b-instruct",
      messages: [
        { role: "system", content: promptContent }
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const newSummary = response.choices[0]?.message?.content?.trim();

    if (newSummary) {
      const convo = await db.select({ summarizedCount: conversations.summarizedCount }).from(conversations).where(eq(conversations.id, conversationId)).limit(1);
      const currentCount = convo[0]?.summarizedCount || 0;

      await db.update(conversations)
        .set({ 
          summary: newSummary,
          summarizedCount: currentCount + newMessages.length,
          updatedAt: new Date()
        })
        .where(eq(conversations.id, conversationId));

      console.log(`[MemoryService] Updated summary for conversation ${conversationId}. Total summarized: ${currentCount + newMessages.length}`);
    }
  } catch (error) {
    console.error(`[MemoryService] Failed to summarize older messages for ${conversationId}:`, error);
  }
}
