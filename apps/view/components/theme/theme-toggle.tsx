import { useEffect, useState } from 'react';
import type { ThemePreference } from '@/components/../hooks/useTheme';
import { Button } from '@/components/ui/button';

interface ThemeToggleProps {
  theme: ThemePreference;
  effectiveTheme: 'light' | 'dark';
  onChange: (theme: ThemePreference) => void;
}

const ORDER: ThemePreference[] = ['system', 'light', 'dark'];

export function ThemeToggle({ theme, effectiveTheme, onChange }: Readonly<ThemeToggleProps>) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggle = () => {
    const currentIndex = ORDER.indexOf(theme);
    const nextTheme = ORDER[(currentIndex + 1) % ORDER.length];
    onChange(nextTheme);
  };

  // During SSR and hydration, render a neutral state to avoid mismatch
  if (!mounted) {
    return (
      <Button
        type="button"
        className="theme-toggle"
        variant="ghost"
        size="icon"
        aria-label="Alternar tema"
      >
        <span aria-hidden="true">🌓</span>
      </Button>
    );
  }

  const icon = effectiveTheme === 'dark' ? '🌙' : '☀️';
  const label = effectiveTheme === 'dark' ? 'Tema escuro' : 'Tema claro';

  return (
    <Button
      type="button"
      onClick={handleToggle}
      className="theme-toggle"
      title={`${label} (clique para alternar)`}
      aria-label={label}
      variant="ghost"
      size="icon"
    >
      <span aria-hidden="true">{icon}</span>
    </Button>
  );
}
