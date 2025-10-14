import type { ChatAction, ChatMessage } from '@/types';
import { StructuredPayloadRenderer } from './structured-payload';

interface MessageBubbleProps {
  message: ChatMessage;
  onAction?: (action: ChatAction) => void;
}

export function MessageBubble({ message, onAction }: Readonly<MessageBubbleProps>) {
  const isAssistant = message.role === 'assistant';
  const bubbleClass = isAssistant ? 'chat-bubble chat-bubble--assistant' : 'chat-bubble chat-bubble--user';
  const wrapperClass = isAssistant ? 'chat-message chat-message--assistant' : 'chat-message chat-message--user';
  const avatarLabel = isAssistant ? 'AI' : 'Você';

  return (
    <div className={wrapperClass} data-role={message.role} data-status={message.status} data-test-id={`chat-message-${message.role}`}>
      <div className="chat-avatar" aria-hidden="true">
        {avatarLabel.slice(0, 2).toUpperCase()}
      </div>
      <div className={bubbleClass} data-test-id="chat-bubble">
        {renderMessageContent(message, onAction)}
      </div>
    </div>
  );
}

function renderMessageContent(message: ChatMessage, onAction?: (action: ChatAction) => void) {
  if (message.status === 'thinking') {
    return (
      <div className="chat-typing">
        <span />
        <span />
        <span />
      </div>
    );
  }

  if (message.status === 'error') {
    return <p className="chat-text chat-text--error">Não consegui responder agora. Tente novamente em instantes.</p>;
  }

  return (
    <div className="chat-content">
      {message.text && renderText(message.text)}
      {Array.isArray(message.structured) && message.structured.length > 0
        ? message.structured.map((payload, index) => (
            <StructuredPayloadRenderer key={`${message.id}-payload-${index}`} payload={payload} onAction={onAction} />
          ))
        : null}
    </div>
  );
}

function renderText(content: string) {
  return (
    <div className="chat-text">
      {content.split('\n').map((line, index) => (
        <p key={`${index}-${line.slice(0, 16)}`}>{line}</p>
      ))}
    </div>
  );
}
