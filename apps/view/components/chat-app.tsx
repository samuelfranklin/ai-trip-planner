'use client';

import type { ChangeEvent, FormEvent, KeyboardEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChatAction } from '@/types';
import { ChatHeader } from '@/components/chat/chat-header';
import { ChatTranscript } from '@/components/chat/chat-transcript';
import { ChatComposer } from '@/components/chat/chat-composer';
import { useTheme } from '@/hooks/useTheme';
import { useChat } from '@/components/providers/chat-provider';

export function ChatApp() {
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const { theme, setTheme, effectiveTheme } = useTheme();
  const { messages, isSending, sendMessage, handleAction, resetConversation } = useChat();

  const isComposerDisabled = useMemo(() => isSending, [isSending]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    adjustComposerHeight();
  }, []);

  const scrollToBottom = () => {
    const node = scrollRef.current;
    if (!node) {
      return;
    }
    node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
  };

  const adjustComposerHeight = () => {
    const node = composerRef.current;
    if (!node) {
      return;
    }
    const maxHeight = 160;
    node.style.height = 'auto';
    const currentScrollHeight = node.scrollHeight;
    const nextHeight = Math.min(currentScrollHeight, maxHeight);
    node.style.height = `${nextHeight}px`;
    node.style.overflowY = currentScrollHeight > maxHeight ? 'auto' : 'hidden';
  };

  const handleInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(event.target.value);
    adjustComposerHeight();
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleSend();
  };

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      return;
    }
    setInputValue('');
    adjustComposerHeight();
    await sendMessage(trimmed);
    requestAnimationFrame(() => composerRef.current?.focus());
  };

  const handleActionPreset = (action: ChatAction) => {
    const template = handleAction(action);
    if (!template) {
      return;
    }
    setInputValue(template);
    requestAnimationFrame(() => {
      adjustComposerHeight();
      composerRef.current?.focus();
    });
  };

  const handleResetConversation = () => {
    resetConversation();
    setInputValue('');
    adjustComposerHeight();
    requestAnimationFrame(() => composerRef.current?.focus());
  };

  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="chat-container p-8 flex flex-col gap-8 justify-between">
        <ChatHeader
          theme={theme}
          effectiveTheme={effectiveTheme}
          onThemeChange={setTheme}
          onResetConversation={handleResetConversation}
        />
        <ChatTranscript messages={messages} onAction={handleActionPreset} scrollRef={scrollRef} />
        <ChatComposer
          value={inputValue}
          disabled={isComposerDisabled}
          onSubmit={handleSubmit}
          onValueChange={handleInputChange}
          onKeyDown={handleComposerKeyDown}
          composerRef={composerRef}
        />
      </div>
    </div>
  );
}
