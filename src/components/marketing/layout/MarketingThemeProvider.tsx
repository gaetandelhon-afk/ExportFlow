'use client';

import { ThemeProvider } from 'next-themes';

export function MarketingThemeProvider({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider attribute="class" forcedTheme="dark">
      {children}
    </ThemeProvider>
  );
}

