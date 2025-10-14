'use client';

import { useState, useEffect } from 'react';
import type { ThreadMetadata } from '@/types';
import { ThreadItem } from './thread-item';
import { Button } from '@/components/ui/button';
import { Icon } from '@iconify/react';
import { listThreads, deleteThread } from '@/lib/langgraph-client';

interface ThreadListProps {
  currentThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onNewThread: () => void;
}

export function ThreadList({ currentThreadId, onSelectThread, onNewThread }: ThreadListProps) {
  const [threads, setThreads] = useState<ThreadMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadThreads = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await listThreads(20);
      setThreads(response.threads);
    } catch (err) {
      console.error('Failed to load threads:', err);
      setError('Falha ao carregar conversas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadThreads();
  }, []);

  const handleDelete = async (threadId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conversa?')) {
      return;
    }

    try {
      await deleteThread(threadId);
      setThreads((prev) => prev.filter((t) => t.id !== threadId));

      // If deleting current thread, notify parent to switch
      if (threadId === currentThreadId) {
        const remaining = threads.filter((t) => t.id !== threadId);
        if (remaining.length > 0) {
          onSelectThread(remaining[0].id);
        } else {
          onNewThread();
        }
      }
    } catch (err) {
      console.error('Failed to delete thread:', err);
      alert('Falha ao excluir conversa');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Icon icon="lucide:loader-2" className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="ghost" size="sm" onClick={loadThreads} className="mt-2">
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="px-4 pt-4">
        <Button onClick={onNewThread} className="w-full" size="sm">
          <Icon icon="lucide:plus" className="h-4 w-4 mr-2" />
          Nova Conversa
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {threads.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Nenhuma conversa ainda
          </div>
        ) : (
          threads.map((thread) => (
            <ThreadItem
              key={thread.id}
              thread={thread}
              isActive={thread.id === currentThreadId}
              onClick={() => onSelectThread(thread.id)}
              onDelete={() => handleDelete(thread.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
