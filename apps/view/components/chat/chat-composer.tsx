'use client';

import type { ChangeEvent, FormEvent, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Icon } from '@iconify/react';

interface ChatComposerProps {
  value: string;
  disabled: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onValueChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  composerRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function ChatComposer({
  value,
  disabled,
  onSubmit,
  onValueChange,
  onKeyDown,
  composerRef,
}: Readonly<ChatComposerProps>) {
  return (
    <footer className="chat-composer">
      <form onSubmit={onSubmit} className="chat-composer__form">
        <div className="chat-composer__field flex flex-row gap-8 items-center justify-between">
          <Textarea
            ref={composerRef}
            value={value}
            onChange={onValueChange}
            onKeyDown={onKeyDown}
            placeholder="Conte seus planos: datas, destinos, estilo de viagem..."
            disabled={disabled}
            aria-label="Envie uma mensagem para o concierge"
          />
          <Button className="!rounded-full !size-14 text-xl" type="submit" disabled={disabled || value.trim().length === 0} aria-label="Enviar mensagem">
            <Icon icon="material-symbols-light:send" className="!size-8" />
          </Button>
        </div>
      </form>
    </footer>
  );
}
