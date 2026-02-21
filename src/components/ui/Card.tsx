import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-white/70 backdrop-blur-sm transition',
        'hover:border-primary/30 dark:bg-white/5 dark:hover:border-primary/25',
        className
      )}
      {...props}
    />
  );
}

