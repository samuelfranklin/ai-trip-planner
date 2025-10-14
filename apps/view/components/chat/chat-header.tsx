'use client';

import type { ThemePreference } from '@/hooks/useTheme';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Button } from '@/components/ui/button';

interface ChatHeaderProps {
  theme: ThemePreference;
  effectiveTheme: 'light' | 'dark';
  onThemeChange: (theme: ThemePreference) => void;
  onResetConversation: () => void;
}

export function ChatHeader({
  theme,
  effectiveTheme,
  onThemeChange,
  onResetConversation,
}: Readonly<ChatHeaderProps>) {
  return (
    <header className="chat-header flex flex-row justify-between gap-4 items-center">
      <div className="chat-header__titles">
        <h1 className="text-2xl font-bold">AI Trip Planner</h1>
        <p className="text-sm text-muted-foreground">Sua experiência de concierge inteligente para planejar viagens sem atrito.</p>
      </div>
      <div className="chat-header__actions flex flex-row-reverse gap-4 items-center">
        <ThemeToggle theme={theme} effectiveTheme={effectiveTheme} onChange={onThemeChange} />
        <Button type="button" variant="outline" onClick={onResetConversation}>
          Nova conversa
        </Button>
      </div>
    </header>
  );
}
