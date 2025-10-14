import { useCallback, useMemo, useRef, useState } from 'react';
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

const FALLBACK_STATUSES = new Set([404, 405, 501]);

export function useChatConversation() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [buildAssistantMessage(WELCOME_MESSAGE)]);
  const [conversationId, setConversationId] = useState(() => createConversationId());
  const [isSending, setIsSending] = useState(false);
  const lastAssistantRef = useRef<string | null>(null);

  const updateAssistantMessage = useCallback((assistantId: string, updater: (message: ChatMessage) => ChatMessage) => {
    setMessages((prev) => prev.map((msg) => (msg.id === assistantId ? updater(msg) : msg)));
  }, []);

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

      setMessages((prev) => [...prev, userMessage, pendingAssistant]);
      lastAssistantRef.current = pendingAssistant.id;
      setIsSending(true);

      try {
        const result = await attemptStreamingConversation(conversationId, trimmed, pendingAssistant.id);

        if (result.ok) {
          setConversationId(result.conversationId ?? conversationId);
        } else if (lastAssistantRef.current) {
          setMessages((prev) =>
            prev.map((message) =>
              message.id === lastAssistantRef.current
                ? {
                    ...message,
                    status: 'error',
                    text: undefined,
                    structured: [],
                  }
                : message,
            ),
          );
        }
      } catch (error) {
        console.error('Falha ao enviar mensagem', error);
        if (lastAssistantRef.current) {
          setMessages((prev) =>
            prev.map((message) =>
              message.id === lastAssistantRef.current
                ? {
                    ...message,
                    status: 'error',
                    text: undefined,
                    structured: [],
                  }
                : message,
            ),
          );
        }
      } finally {
        setIsSending(false);
      }
    },
    [attemptStreamingConversation, conversationId, isSending],
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
    setConversationId(createConversationId());
    setMessages([buildAssistantMessage(WELCOME_MESSAGE)]);
  }, []);

  return useMemo(
    () => ({
      messages,
      isSending,
      conversationId,
      sendMessage,
      setMessages,
      setConversationId,
      handleAction,
      resetConversation,
    }),
    [messages, isSending, conversationId, sendMessage, handleAction, resetConversation],
  );
}

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
