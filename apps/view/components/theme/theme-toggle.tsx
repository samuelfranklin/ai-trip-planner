import type { ThemePreference } from '@/components/../hooks/useTheme';
import { Button } from '@/components/ui/button';

interface ThemeToggleProps {
  theme: ThemePreference;
  effectiveTheme: 'light' | 'dark';
  onChange: (theme: ThemePreference) => void;
}

const ORDER: ThemePreference[] = ['system', 'light', 'dark'];

export function ThemeToggle({ theme, effectiveTheme, onChange }: Readonly<ThemeToggleProps>) {
  const icon = effectiveTheme === 'dark' ? '🌙' : '☀️';
  const label = effectiveTheme === 'dark' ? 'Tema escuro' : 'Tema claro';

  const handleToggle = () => {
    const currentIndex = ORDER.indexOf(theme);
    const nextTheme = ORDER[(currentIndex + 1) % ORDER.length];
    onChange(nextTheme);
  };

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
