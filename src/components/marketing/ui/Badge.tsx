import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center rounded-full border border-border bg-background-alt px-2.5 py-1 text-xs font-semibold leading-snug text-text-secondary',
        'whitespace-normal break-words',
        className
      )}
      {...props}
    />
  );
}

