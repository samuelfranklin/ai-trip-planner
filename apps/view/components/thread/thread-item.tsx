'use client';

import type { ThreadMetadata } from '@/types';
import { Button } from '@/components/ui/button';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';

interface ThreadItemProps {
  thread: ThreadMetadata;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}

export function ThreadItem({ thread, isActive, onClick, onDelete }: ThreadItemProps) {
  const lastMessage = thread.summary.lastUserMessage || thread.summary.lastAssistantMessage;
  const formattedDate = new Date(thread.updatedAt).toLocaleDateString('pt-BR', {
    month: 'short',
    day: 'numeric',
  });

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  return (
    <div
      className={cn(
        'thread-item group relative flex flex-col gap-2 rounded-lg border p-3 cursor-pointer transition-all',
        'hover:bg-accent hover:border-primary/30',
        isActive
          ? 'bg-primary/10 border-primary shadow-sm'
          : 'bg-card border-border'
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-sm line-clamp-1 flex-1">
          {thread.title}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={handleDelete}
          aria-label="Excluir thread"
        >
          <Icon icon="lucide:trash-2" className="h-3.5 w-3.5" />
        </Button>
      </div>
      {lastMessage && (
        <p className="text-xs text-muted-foreground line-clamp-2">
          {lastMessage}
        </p>
      )}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formattedDate}</span>
        <span className="flex items-center gap-1">
          <Icon icon="lucide:message-circle" className="h-3 w-3" />
          {thread.summary.totalMessages}
        </span>
      </div>
    </div>
  );
}
