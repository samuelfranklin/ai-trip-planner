'use client';

import { useState } from 'react';
import { ThreadList } from './thread-list';
import { Button } from '@/components/ui/button';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';

interface ThreadSidebarProps {
  currentThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onNewThread: () => void;
}

export function ThreadSidebar({ currentThreadId, onSelectThread, onNewThread }: ThreadSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <>
      {/* Mobile Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed top-4 left-4 z-50"
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-label={isCollapsed ? 'Mostrar conversas' : 'Ocultar conversas'}
      >
        <Icon icon={isCollapsed ? 'lucide:menu' : 'lucide:x'} className="h-5 w-5" />
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          'thread-sidebar flex flex-col bg-card border-r border-border transition-all duration-300',
          'lg:relative lg:translate-x-0',
          'fixed inset-y-0 left-0 z-40 w-72',
          isCollapsed ? '-translate-x-full' : 'translate-x-0'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold text-lg">Conversas</h2>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setIsCollapsed(true)}
            aria-label="Fechar sidebar"
          >
            <Icon icon="lucide:x" className="h-5 w-5" />
          </Button>
        </div>

        {/* Thread List */}
        <ThreadList
          currentThreadId={currentThreadId}
          onSelectThread={(threadId) => {
            onSelectThread(threadId);
            setIsCollapsed(true); // Close on mobile after selection
          }}
          onNewThread={() => {
            onNewThread();
            setIsCollapsed(true); // Close on mobile after creating
          }}
        />
      </aside>

      {/* Mobile Overlay */}
      {!isCollapsed && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsCollapsed(true)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
