import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { fetchNvidiaChatStream, Message } from '../services/nvidia.service';
import { saveConversation, saveMessage, generateConversationTitle, getRecentConversations, getMessagesByConversationId, getConversationProjectId, getDecryptedApiKeyForProject } from '../services/chat.service';
import { assemblePrompt } from '../services/prompt.service';

const chatRoute = new Hono();

chatRoute.post('/stream', async (c) => {
  const body = await c.req.json<{ userMessage: string, model?: string, conversationId?: string, projectId?: string }>().catch(() => null);
  
  if (!body || typeof body.userMessage !== 'string' || body.userMessage.trim() === '') {
    return c.json({ error: 'Invalid user message' }, 400);
  }

  let { conversationId, projectId: reqProjectId, userMessage } = body;
  let isNewConversation = false;

  try {
    if (!conversationId) {
      conversationId = await saveConversation('New Chat', reqProjectId || 'default');
      isNewConversation = true;
    }

    const projectId = await getConversationProjectId(conversationId);
    const apiKey = await getDecryptedApiKeyForProject(projectId);

    // Save the incoming user message to the database immediately
    await saveMessage(conversationId, 'user', userMessage);

    // Fetch the full historical messages list from the database
    const dbMessages = await getMessagesByConversationId(conversationId);
    
    // Sanitize messages to prevent API rejecting empty assistant messages
    const sanitizedMessages = dbMessages.filter((m: any) => typeof m.content === 'string' && m.content.trim() !== '');

    // Dynamic Summary Window Logic
    const { getConversationMemoryState } = await import('../services/chat.service');
    const { summarizeOlderMessages } = await import('../services/memory.service');
    
    const memoryState = await getConversationMemoryState(conversationId);
    const { summary, summarizedCount } = memoryState;

    const nonSystemMessages = sanitizedMessages.filter((m: any) => m.role !== 'system');
    
    const WINDOW_SIZE = 10;
    let windowedMessages = nonSystemMessages;
    
    if (nonSystemMessages.length > WINDOW_SIZE) {
      const messagesOutsideWindow = nonSystemMessages.slice(0, nonSystemMessages.length - WINDOW_SIZE);
      const unsummarizedOutsideWindow = messagesOutsideWindow.slice(summarizedCount);
      
      if (unsummarizedOutsideWindow.length >= 4) {
        // Background summarization task
        summarizeOlderMessages(conversationId, apiKey, summary, unsummarizedOutsideWindow).catch(console.error);
      }
      
      windowedMessages = nonSystemMessages.slice(-WINDOW_SIZE);
    }

    const assembledMessages = await assemblePrompt(windowedMessages, summary);
    const openaiStream = await fetchNvidiaChatStream(apiKey, assembledMessages, body.model);
    
    return streamSSE(c, async (stream) => {
      // Stream the conversation ID first
      await stream.writeSSE({
        data: JSON.stringify({ type: 'conversation_id', id: conversationId }),
      });

      let accumulatedAssistantMessage = '';

      for await (const chunk of openaiStream) {
        const content = chunk.choices[0]?.delta?.content || '';
        accumulatedAssistantMessage += content;
        
        if (content) {
          await stream.writeSSE({
            data: JSON.stringify(content),
          });
        }
      }

      await saveMessage(conversationId as string, 'assistant', accumulatedAssistantMessage);

      if (isNewConversation && userMessage) {
        setImmediate(() => {
          generateConversationTitle(conversationId as string, userMessage).catch(console.error);
        });
      }
    });

  } catch (error: any) {
    console.error('Error handling chat stream:', error);
    return c.json({ error: error.message || 'Internal Server Error' }, 500);
  }
});

chatRoute.get('/conversations', async (c) => {
  try {
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit') as string, 10) : 20;
    const history = await getRecentConversations(limit);
    return c.json({ conversations: history });
  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    return c.json({ error: error.message || 'Internal Server Error' }, 500);
  }
});

chatRoute.get('/conversations/:id/messages', async (c) => {
  try {
    const id = c.req.param('id');
    const messagesList = await getMessagesByConversationId(id);
    return c.json({ messages: messagesList });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

chatRoute.put('/conversations/:id/rename', async (c) => {
  try {
    const id = c.req.param('id');
    const { title } = await c.req.json<{ title: string }>();
    if (!title) return c.json({ error: 'Missing title' }, 400);
    const { renameConversation } = await import('../services/chat.service');
    await renameConversation(id, title);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

chatRoute.delete('/conversations/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { deleteConversation } = await import('../services/chat.service');
    await deleteConversation(id);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default chatRoute;
