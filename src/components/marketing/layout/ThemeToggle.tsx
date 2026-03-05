'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';

import { Button } from '@/components/marketing/ui/Button';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const effective = (mounted ? resolvedTheme : theme) ?? 'light';
  const isDark = effective === 'dark';

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-9 w-9 px-0"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="h-[18px] w-[18px] text-text-secondary" strokeWidth={1.75} />
      ) : (
        <Moon className="h-[18px] w-[18px] text-text-secondary" strokeWidth={1.75} />
      )}
    </Button>
  );
}

