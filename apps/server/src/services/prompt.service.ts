import { db, globalRules } from '@nimstudio/db';
import { eq, desc } from 'drizzle-orm';
import { Message } from './nvidia.service';

export async function assemblePrompt(messages: Message[], summary: string | null = null): Promise<Message[]> {
  // Fetch active rules ordered by priority descending
  const activeRules = await db.select()
    .from(globalRules)
    .where(eq(globalRules.isActive, true))
    .orderBy(desc(globalRules.priority));

  let rulesText = "";
  if (activeRules.length > 0) {
    rulesText = "## Global Instructions\n";
    activeRules.forEach((rule: any, index: number) => {
      rulesText += `${index + 1}. ${rule.content}\n`;
    });
  }

  let memoryText = "";
  if (summary) {
    memoryText = `## Memory Context\nThe following is a highly compressed summary of the earlier parts of this conversation. Treat this as direct past context:\n<summary>\n${summary}\n</summary>\n`;
  }

  const systemContent = [rulesText, memoryText].filter(t => t.trim().length > 0).join('\n\n');

  if (!systemContent) {
    return messages;
  }

  const processedMessages = [...messages];
  
  // If the first message is already a system prompt, append the system content
  if (processedMessages.length > 0 && processedMessages[0].role === 'system') {
    processedMessages[0].content = `${processedMessages[0].content}\n\n${systemContent}`;
  } else {
    // Otherwise, unshift a new system prompt at the beginning
    processedMessages.unshift({
      role: 'system',
      content: systemContent
    });
  }

  return processedMessages;
}
