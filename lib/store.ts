import { create } from 'zustand';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatState {
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
  activeModelId: string | null;
  activeConversationId: string | null;
  activeProjectId: string;
  sidebarWidth: number;
  chatNotFound: boolean;
  activeMessageIndex: number | null;
  isProgrammaticScroll: boolean;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (content: string) => void;
  setIsStreaming: (isStreaming: boolean) => void;
  setActiveModelId: (id: string) => void;
  setActiveConversationId: (id: string | null) => void;
  setActiveProjectId: (id: string) => void;
  setSidebarWidth: (width: number) => void;
  setChatNotFound: (notFound: boolean) => void;
  setActiveMessageIndex: (index: number | null) => void;
  setIsProgrammaticScroll: (isProgrammatic: boolean) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [
    {
      role: 'assistant',
      content: 'Hello! I am ready to help you. What would you like to build today?'
    }
  ],
  isStreaming: false,
  streamingContent: '',
  activeModelId: 'deepseek-ai/deepseek-v4-flash',
  activeConversationId: null,
  activeProjectId: 'default',
  sidebarWidth: 250,
  chatNotFound: false,
  activeMessageIndex: null,
  isProgrammaticScroll: false,
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setMessages: (messages) => set({ messages }),
  setStreamingContent: (content) => set({ streamingContent: content }),
  appendStreamingContent: (content) => set((state) => ({ streamingContent: state.streamingContent + content })),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  setActiveModelId: (id) => set({ activeModelId: id }),
  setActiveConversationId: (id) => set({ activeConversationId: id }),
  setActiveProjectId: (id) => set({ activeProjectId: id }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setChatNotFound: (notFound) => set({ chatNotFound: notFound }),
  setActiveMessageIndex: (index) => set({ activeMessageIndex: index }),
  setIsProgrammaticScroll: (isProgrammatic) => set({ isProgrammaticScroll: isProgrammatic }),
}));
