'use client';

import type { ChatAction, ChatMessage } from '@/types';
import { MessageBubble } from './message-bubble';

interface ChatTranscriptProps {
  messages: ChatMessage[];
  onAction: (action: ChatAction) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

export function ChatTranscript({ messages, onAction, scrollRef }: Readonly<ChatTranscriptProps>) {
  return (
    <div
      className="chat-transcript h-full flex flex-col justify-start overflow-y-auto"
      ref={scrollRef}
      role="log"
      aria-live="polite"
      aria-label="Mensagens do chat"
    >
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} onAction={onAction} />
      ))}
    </div>
  );
}
