'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AgentStreamEvent, ChatAction, ChatMessage } from '@/types';
import { createConversationId, resolveApiUrl } from '@/lib/api';
import { parseAgentResponse } from '@/lib/parseAgentResponse';
import { streamAgentResponse } from '@/lib/streaming';

const WELCOME_MESSAGE =
  'Olá! Sou seu concierge de viagens. Conte seus planos, datas ou preferências e eu trago voos, hotéis e ideias personalizadas.';

type ConversationMode = 'stream' | 'fallback';

interface AttemptResult {
  ok: boolean;
  mode: ConversationMode;
  conversationId?: string;
}

interface Thread {
  id: string;
  title: string;
  messages: ChatMessage[];
  conversationId: string;
  createdAt: number;
  updatedAt: number;
}

interface ChatContextValue {
  // Current conversation state
  messages: ChatMessage[];
  isSending: boolean;
  conversationId: string;

  // Thread management
  threads: Thread[];
  currentThreadId: string | null;

  // Actions
  sendMessage: (message: string) => Promise<void>;
  handleAction: (action: ChatAction) => string;
  resetConversation: () => void;

  // Thread operations
  createThread: (title?: string) => string;
  switchThread: (threadId: string) => void;
  deleteThread: (threadId: string) => void;
  renameThread: (threadId: string, newTitle: string) => void;

  // For advanced use cases
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setConversationId: React.Dispatch<React.SetStateAction<string>>;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

const FALLBACK_STATUSES = new Set([404, 405, 501]);

export function ChatProvider({ children }: { children: ReactNode }) {
  // Thread management state
  const [threads, setThreads] = useState<Thread[]>(() => {
    const initialThread: Thread = {
      id: 'thread-1',
      title: 'Nova Conversa',
      messages: [buildAssistantMessage(WELCOME_MESSAGE)],
      conversationId: createConversationId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    return [initialThread];
  });

  const [currentThreadId, setCurrentThreadId] = useState<string>('thread-1');

  // Current conversation state
  const currentThread = threads.find((t) => t.id === currentThreadId);
  const [messages, setMessages] = useState<ChatMessage[]>(currentThread?.messages ?? []);
  const [conversationId, setConversationId] = useState(currentThread?.conversationId ?? createConversationId());
  const [isSending, setIsSending] = useState(false);
  const lastAssistantRef = useRef<string | null>(null);

  // Sync current thread with messages when they change
  const syncThreadMessages = useCallback((newMessages: ChatMessage[]) => {
    setMessages(newMessages);
    setThreads((prevThreads) =>
      prevThreads.map((thread) =>
        thread.id === currentThreadId
          ? { ...thread, messages: newMessages, updatedAt: Date.now() }
          : thread
      )
    );
  }, [currentThreadId]);

  const updateAssistantMessage = useCallback((assistantId: string, updater: (message: ChatMessage) => ChatMessage) => {
    setMessages((prev) => {
      const updated = prev.map((msg) => (msg.id === assistantId ? updater(msg) : msg));
      setThreads((prevThreads) =>
        prevThreads.map((thread) =>
          thread.id === currentThreadId
            ? { ...thread, messages: updated, updatedAt: Date.now() }
            : thread
        )
      );
      return updated;
    });
  }, [currentThreadId]);

  const runLegacyConversation = useCallback(
    async (baseConversationId: string, message: string, assistantId: string): Promise<AttemptResult> => {
      const response = await fetch(resolveApiUrl('/agent'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: baseConversationId, message }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const payload = await response.json();
      const nextConversationId =
        typeof payload.conversationId === 'string' ? payload.conversationId : baseConversationId;

      const parsed = parseAgentResponse(payload.response);
      updateAssistantMessage(assistantId, (msg) => ({
        ...msg,
        status: 'complete',
        text: parsed.text || 'Tudo pronto! Veja os detalhes abaixo.',
        structured: parsed.payloads,
      }));

      return { ok: true, mode: 'fallback', conversationId: nextConversationId };
    },
    [updateAssistantMessage],
  );

  const attemptStreamingConversation = useCallback(
    async (baseConversationId: string, message: string, assistantId: string): Promise<AttemptResult> => {
      const streamingResult = await streamAgentResponse(
        {
          conversationId: baseConversationId,
          message,
        },
        {
          onEvent: (event: AgentStreamEvent) => {
            if (event.type === 'delta') {
              updateAssistantMessage(assistantId, (msg) => ({
                ...msg,
                status: 'streaming',
                text: event.data.fullText,
              }));
            } else if (event.type === 'error') {
              updateAssistantMessage(assistantId, (msg) => ({
                ...msg,
                status: 'error',
                text: undefined,
                structured: [],
              }));
            } else if (event.type === 'meta') {
              setConversationId(event.data.conversationId);
            }
          },
        },
      );

      if (streamingResult.ok) {
        const parsed = parseAgentResponse(streamingResult.text ?? '');
        updateAssistantMessage(assistantId, (msg) => ({
          ...msg,
          status: 'complete',
          text: parsed.text || 'Tudo pronto! Veja os detalhes abaixo.',
          structured: parsed.payloads,
        }));
        return { ok: true, mode: 'stream', conversationId: streamingResult.conversationId };
      }

      if (typeof streamingResult.status === 'number' && FALLBACK_STATUSES.has(streamingResult.status)) {
        return runLegacyConversation(baseConversationId, message, assistantId);
      }

      return { ok: false, mode: 'stream' };
    },
    [runLegacyConversation, updateAssistantMessage],
  );

  const sendMessage = useCallback(
    async (inputValue: string) => {
      const trimmed = inputValue.trim();
      if (!trimmed || isSending) {
        return;
      }

      const userMessage = buildUserMessage(trimmed);
      const pendingAssistant = buildAssistantPlaceholder();

      syncThreadMessages([...messages, userMessage, pendingAssistant]);
      lastAssistantRef.current = pendingAssistant.id;
      setIsSending(true);

      try {
        const result = await attemptStreamingConversation(conversationId, trimmed, pendingAssistant.id);

        if (result.ok) {
          setConversationId(result.conversationId ?? conversationId);
        } else if (lastAssistantRef.current) {
          updateAssistantMessage(lastAssistantRef.current, (msg) => ({
            ...msg,
            status: 'error',
            text: undefined,
            structured: [],
          }));
        }
      } catch (error) {
        console.error('Falha ao enviar mensagem', error);
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
      }
    },
    [attemptStreamingConversation, conversationId, isSending, messages, syncThreadMessages, updateAssistantMessage],
  );

  const handleAction = useCallback(
    (action: ChatAction) => {
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
    },
    [],
  );

  const resetConversation = useCallback(() => {
    const newConversationId = createConversationId();
    const welcomeMsg = buildAssistantMessage(WELCOME_MESSAGE);

    setConversationId(newConversationId);
    syncThreadMessages([welcomeMsg]);
  }, [syncThreadMessages]);

  // Thread operations
  const createThread = useCallback((title?: string) => {
    const newThreadId = `thread-${Date.now()}`;
    const newConversationId = createConversationId();
    const newThread: Thread = {
      id: newThreadId,
      title: title || 'Nova Conversa',
      messages: [buildAssistantMessage(WELCOME_MESSAGE)],
      conversationId: newConversationId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setThreads((prev) => [...prev, newThread]);
    setCurrentThreadId(newThreadId);
    setMessages(newThread.messages);
    setConversationId(newConversationId);

    return newThreadId;
  }, []);

  const switchThread = useCallback((threadId: string) => {
    const thread = threads.find((t) => t.id === threadId);
    if (thread) {
      setCurrentThreadId(threadId);
      setMessages(thread.messages);
      setConversationId(thread.conversationId);
    }
  }, [threads]);

  const deleteThread = useCallback((threadId: string) => {
    setThreads((prev) => {
      const filtered = prev.filter((t) => t.id !== threadId);

      // If deleting current thread, switch to another thread
      if (threadId === currentThreadId) {
        const remainingThread = filtered[0];
        if (remainingThread) {
          setCurrentThreadId(remainingThread.id);
          setMessages(remainingThread.messages);
          setConversationId(remainingThread.conversationId);
        } else {
          // No threads left, create a new one
          const newThreadId = `thread-${Date.now()}`;
          const newConversationId = createConversationId();
          const newThread: Thread = {
            id: newThreadId,
            title: 'Nova Conversa',
            messages: [buildAssistantMessage(WELCOME_MESSAGE)],
            conversationId: newConversationId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          setCurrentThreadId(newThreadId);
          setMessages(newThread.messages);
          setConversationId(newConversationId);
          return [newThread];
        }
      }

      return filtered;
    });
  }, [currentThreadId]);

  const renameThread = useCallback((threadId: string, newTitle: string) => {
    setThreads((prev) =>
      prev.map((thread) =>
        thread.id === threadId
          ? { ...thread, title: newTitle, updatedAt: Date.now() }
          : thread
      )
    );
  }, []);

  const value = useMemo(
    () => ({
      messages,
      isSending,
      conversationId,
      threads,
      currentThreadId,
      sendMessage,
      handleAction,
      resetConversation,
      createThread,
      switchThread,
      deleteThread,
      renameThread,
      setMessages,
      setConversationId,
    }),
    [
      messages,
      isSending,
      conversationId,
      threads,
      currentThreadId,
      sendMessage,
      handleAction,
      resetConversation,
      createThread,
      switchThread,
      deleteThread,
      renameThread,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
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
