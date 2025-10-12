import type { ChangeEvent, FormEvent, KeyboardEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import type { ChatAction, ChatMessage } from './types';
import { resolveApiUrl, createConversationId } from './lib/api';
import { parseAgentResponse } from './lib/parseAgentResponse';
import { MessageBubble } from './components/chat/message-bubble';
import { Button } from './components/ui/button';
import { TextArea } from './components/ui/textarea';
import { ThemeToggle } from './components/theme/theme-toggle';
import { useTheme } from './hooks/useTheme';

const WELCOME_MESSAGE =
  'Olá! Sou seu concierge de viagens. Conte seus planos, datas ou preferências e eu trago voos, hotéis e ideias personalizadas.';

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [buildAssistantMessage(WELCOME_MESSAGE)]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [conversationId, setConversationId] = useState(() => createConversationId());
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const { theme, setTheme, effectiveTheme } = useTheme();

  const isComposerDisabled = useMemo(() => isSending, [isSending]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    adjustComposerHeight();
  }, []);

  function scrollToBottom() {
    const node = scrollRef.current;
    if (!node) {
      return;
    }
    node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
  }

  function adjustComposerHeight() {
    const node = composerRef.current;
    if (!node) {
      return;
    }
    node.style.height = 'auto';
    const nextHeight = Math.min(node.scrollHeight, 160);
    node.style.height = `${nextHeight}px`;
  }

  const handleInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(event.target.value);
    adjustComposerHeight();
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage();
  };

  const sendMessage = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isSending) {
      return;
    }

    const userMessage = buildUserMessage(trimmed);
    const pendingAssistant = buildAssistantPlaceholder();

    setMessages((prev) => [...prev, userMessage, pendingAssistant]);
    setInputValue('');
    setIsSending(true);
    adjustComposerHeight();

    try {
      const response = await fetch(resolveApiUrl('/agent'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, message: trimmed }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const payload = await response.json();
      const nextConversationId = typeof payload.conversationId === 'string' ? payload.conversationId : conversationId;
      setConversationId(nextConversationId);

      const parsed = parseAgentResponse(payload.response);

      setMessages((prev) =>
        prev.map((message) =>
          message.id === pendingAssistant.id
            ? {
                ...message,
                status: 'complete',
                text: parsed.text || 'Tudo pronto! Veja os detalhes abaixo.',
                structured: parsed.payloads,
              }
            : message,
        ),
      );
    } catch (error) {
      console.error('Falha ao enviar mensagem', error);
      setMessages((prev) =>
        prev.map((message) =>
          message.id === pendingAssistant.id
            ? {
                ...message,
                status: 'error',
                text: undefined,
                structured: [],
              }
            : message,
        ),
      );
    } finally {
      setIsSending(false);
      requestAnimationFrame(() => composerRef.current?.focus());
    }
  };

  const handleAction = (action: ChatAction) => {
    if (action.type === 'bookFlight') {
      const template = `Use book_flight no itinerário ${action.itineraryId} para reservar minha viagem. Informe que são 2 adultos e adicione os dados dos passageiros.`;
      setInputValue(template);
    }

    if (action.type === 'bookHotel') {
      const template = `Use book_hotel no hotel ${action.hotelId} para confirmar a hospedagem. Solicite café da manhã e mencione preferências especiais.`;
      setInputValue(template);
    }

    requestAnimationFrame(() => {
      adjustComposerHeight();
      composerRef.current?.focus();
    });
  };

  const handleResetConversation = () => {
    setConversationId(createConversationId());
    setMessages([buildAssistantMessage(WELCOME_MESSAGE)]);
    setInputValue('');
    adjustComposerHeight();
    requestAnimationFrame(() => composerRef.current?.focus());
  };

  return (
    <div className="app-shell">
      <div className="chat-container">
        <header className="chat-header">
          <div className="chat-header__titles">
            <h1>AI Trip Planner</h1>
            <p>Sua experiência de concierge inteligente para planejar viagens sem atrito.</p>
          </div>
          <div className="chat-header__actions">
            <ThemeToggle theme={theme} effectiveTheme={effectiveTheme} onChange={setTheme} />
            <Button type="button" variant="outline" onClick={handleResetConversation}>
              Nova conversa
            </Button>
          </div>
        </header>
        <div className="chat-scroll" ref={scrollRef} role="log" aria-live="polite" aria-label="Mensagens do chat">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} onAction={handleAction} />
          ))}
        </div>
        <footer className="chat-composer">
          <form onSubmit={handleSubmit} className="chat-composer__form">
            <TextArea
              ref={composerRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleComposerKeyDown}
              placeholder="Conte seus planos: datas, destinos, estilo de viagem..."
              disabled={isComposerDisabled}
              aria-label="Envie uma mensagem para o concierge"
            />
            <div className="chat-composer__actions">
              <Button type="submit" disabled={isComposerDisabled || inputValue.trim().length === 0}>
                {isSending ? 'Enviando...' : 'Enviar'}
              </Button>
            </div>
          </form>
        </footer>
      </div>
    </div>
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
