'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ChatAction, ChatMessage, StreamEvent } from '@/types';
import { parseAgentResponse } from '@/lib/parseAgentResponse';
import {
  createThread,
  streamMessages,
  listThreads,
  getThread,
  deleteThread as deleteThreadApi,
  type ThreadMetadata,
} from '@/lib/langgraph-client';

const WELCOME_MESSAGE =
  'Olá! Sou seu concierge de viagens. Conte seus planos, datas ou preferências e eu trago voos, hotéis e ideias personalizadas.';

interface ChatContextValue {
  // Current conversation state
  messages: ChatMessage[];
  isSending: boolean;
  threadId: string | null;

  // Thread management
  threads: ThreadMetadata[];
  currentThreadId: string | null;

  // Actions
  sendMessage: (message: string) => Promise<void>;
  handleAction: (action: ChatAction) => string;
  resetConversation: () => void;

  // Thread operations
  createNewThread: (title?: string) => Promise<void>;
  switchThread: (threadId: string) => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;
  loadThreads: () => Promise<void>;

  // For advanced use cases
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export function ChatProviderSDK({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([buildAssistantMessage(WELCOME_MESSAGE)]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threads, setThreads] = useState<ThreadMetadata[]>([]);
  const [isSending, setIsSending] = useState(false);
  const lastAssistantRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const updateAssistantMessage = useCallback((assistantId: string, updater: (message: ChatMessage) => ChatMessage) => {
    setMessages((prev) => prev.map((msg) => (msg.id === assistantId ? updater(msg) : msg)));
  }, []);

  const loadThreads = useCallback(async () => {
    try {
      const response = await listThreads(20);
      setThreads(response.threads);
    } catch (error) {
      console.error('Failed to load threads:', error);
    }
  }, []);

  const createNewThread = useCallback(async (title?: string) => {
    try {
      const response = await createThread(title);
      const newThread = response.thread;

      setThreadId(newThread.id);
      setMessages([buildAssistantMessage(WELCOME_MESSAGE)]);
      setThreads((prev) => [newThread, ...prev]);
    } catch (error) {
      console.error('Failed to create thread:', error);
      throw error;
    }
  }, []);

  const switchThread = useCallback(async (newThreadId: string) => {
    try {
      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      const response = await getThread(newThreadId);
      setThreadId(newThreadId);

      // Convert SDK messages to ChatMessages
      const chatMessages: ChatMessage[] = response.messages.map((msg) => ({
        id: msg.id,
        role: msg.role === 'user' ? 'user' : 'assistant',
        text: msg.content,
        structured: [],
        status: 'complete' as const,
        createdAt: new Date(msg.createdAt).getTime(),
      }));

      if (chatMessages.length === 0) {
        chatMessages.push(buildAssistantMessage(WELCOME_MESSAGE));
      }

      setMessages(chatMessages);
    } catch (error) {
      console.error('Failed to switch thread:', error);
      throw error;
    }
  }, []);

  const deleteThread = useCallback(
    async (threadIdToDelete: string) => {
      try {
        await deleteThreadApi(threadIdToDelete);
        setThreads((prev) => prev.filter((t) => t.id !== threadIdToDelete));

        // If deleting current thread, create a new one
        if (threadIdToDelete === threadId) {
          await createNewThread();
        }
      } catch (error) {
        console.error('Failed to delete thread:', error);
        throw error;
      }
    },
    [threadId, createNewThread]
  );

  const extractContentFromEvent = useCallback((event: StreamEvent): string | null => {
    if (event.type !== 'event') return null;

    // Try to extract content from various event structures
    try {
      const data = event.data;

      // Handle messages event with content
      if (data?.messages && Array.isArray(data.messages)) {
        const lastMessage = data.messages[data.messages.length - 1];
        if (lastMessage?.content) {
          return typeof lastMessage.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage.content);
        }
      }

      // Handle chunk event with content
      if (data?.chunk?.content) {
        return typeof data.chunk.content === 'string' ? data.chunk.content : JSON.stringify(data.chunk.content);
      }

      // Handle direct content field
      if (data?.content) {
        return typeof data.content === 'string' ? data.content : JSON.stringify(data.content);
      }
    } catch (error) {
      console.warn('Failed to extract content from event:', error);
    }

    return null;
  }, []);

  const sendMessage = useCallback(
    async (inputValue: string) => {
      const trimmed = inputValue.trim();
      if (!trimmed || isSending) {
        return;
      }

      // Ensure we have a thread
      let activeThreadId = threadId;
      if (!activeThreadId) {
        try {
          const response = await createThread();
          activeThreadId = response.thread.id;
          setThreadId(activeThreadId);
          setThreads((prev) => [response.thread, ...prev]);
        } catch (error) {
          console.error('Failed to create thread:', error);
          return;
        }
      }

      const userMessage = buildUserMessage(trimmed);
      const pendingAssistant = buildAssistantPlaceholder();

      setMessages((prev) => [...prev, userMessage, pendingAssistant]);
      lastAssistantRef.current = pendingAssistant.id;
      setIsSending(true);

      abortControllerRef.current = new AbortController();
      let accumulatedContent = '';

      try {
        await streamMessages(
          activeThreadId,
          trimmed,
          (event: StreamEvent) => {
            if (event.type === 'event') {
              // Extract and accumulate content
              const content = extractContentFromEvent(event);
              if (content) {
                accumulatedContent = content;
                updateAssistantMessage(pendingAssistant.id, (msg) => ({
                  ...msg,
                  status: 'streaming',
                  text: content,
                }));
              }
            } else if (event.type === 'complete') {
              // Parse final content for structured payloads
              const parsed = parseAgentResponse(accumulatedContent || '');
              updateAssistantMessage(pendingAssistant.id, (msg) => ({
                ...msg,
                status: 'complete',
                text: parsed.text || 'Tudo pronto! Veja os detalhes abaixo.',
                structured: parsed.payloads,
              }));
            } else if (event.type === 'error') {
              updateAssistantMessage(pendingAssistant.id, (msg) => ({
                ...msg,
                status: 'error',
                text: undefined,
                structured: [],
              }));
            }
          },
          abortControllerRef.current.signal
        );

        // Reload threads to update summary
        await loadThreads();
      } catch (error) {
        console.error('Failed to send message:', error);
        if (lastAssistantRef.current) {
          updateAssistantMessage(lastAssistantRef.current, (msg) => ({
            ...msg,
            status: 'error',
            text: undefined,
            structured: [],
          }));
        }
      } finally {
        setIsSending(false);
        abortControllerRef.current = null;
      }
    },
    [threadId, isSending, updateAssistantMessage, extractContentFromEvent, loadThreads]
  );

  const handleAction = useCallback((action: ChatAction) => {
    if (action.type === 'bookFlight') {
      return `Use book_flight no itinerário ${action.itineraryId} para reservar minha viagem. Informe que são 2 adultos e adicione os dados dos passageiros.`;
    }
    if (action.type === 'bookHotel') {
      return `Use book_hotel no hotel ${action.hotelId} para confirmar a hospedagem. Solicite café da manhã e mencione preferências especiais.`;
    }
    if (action.type === 'cancelFlight') {
      return `Use cancel_flight no PNR ${action.pnr} para cancelar a reserva e confirmar as condições aplicáveis.`;
    }
    if (action.type === 'cancelHotel') {
      return `Use cancel_hotel na reserva ${action.reservationId} garantindo que o cliente seja informado sobre taxas e políticas.`;
    }
    return '';
  }, []);

  const resetConversation = useCallback(async () => {
    try {
      await createNewThread();
    } catch (error) {
      console.error('Failed to reset conversation:', error);
    }
  }, [createNewThread]);

  const value = useMemo(
    () => ({
      messages,
      isSending,
      threadId,
      threads,
      currentThreadId: threadId,
      sendMessage,
      handleAction,
      resetConversation,
      createNewThread,
      switchThread,
      deleteThread,
      loadThreads,
      setMessages,
    }),
    [
      messages,
      isSending,
      threadId,
      threads,
      sendMessage,
      handleAction,
      resetConversation,
      createNewThread,
      switchThread,
      deleteThread,
      loadThreads,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatSDK() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatSDK must be used within a ChatProviderSDK');
  }
  return context;
}

// Helper functions
function buildAssistantMessage(text: string): ChatMessage {
  return {
    id: `assistant-${Date.now()}`,
    role: 'assistant',
    text,
    structured: [],
    status: 'complete',
    createdAt: Date.now(),
  };
}

function buildAssistantPlaceholder(): ChatMessage {
  return {
    id: `assistant-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role: 'assistant',
    status: 'thinking',
    structured: [],
    createdAt: Date.now(),
  };
}

function buildUserMessage(text: string): ChatMessage {
  return {
    id: `user-${Date.now()}`,
    role: 'user',
    text,
    status: 'complete',
    structured: [],
    createdAt: Date.now(),
  };
}
