'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { locales, type Locale } from '@/i18n/locales';

const labels: Record<Locale, string> = {
  en: 'EN',
  zh: '中文',
  fr: 'FR',
  es: 'ES',
  id: 'ID',
  tr: 'TR'
};

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale() as Locale;
  const [open, setOpen] = useState(false);

  const items = useMemo(
    () =>
      locales.map((l) => ({
        locale: l,
        label: labels[l]
      })),
    []
  );

  function switchTo(nextLocale: Locale) {
    if (nextLocale === locale) return;

    const segments = pathname.split('/');
    segments[1] = nextLocale;
    const nextPath = segments.join('/');

    router.push(nextPath);
    setOpen(false);
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="h-9 px-2"
      >
        <span className="text-xs font-semibold text-text-secondary">
          {labels[locale]}
        </span>
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          className={cn(
            'h-4 w-4 text-text-secondary transition',
            open && 'rotate-180'
          )}
        >
          <path
            d="M5 7.5l5 5 5-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-28 overflow-hidden rounded-xl border border-border bg-white shadow-soft dark:bg-[#0f0f14]"
        >
          {items.map((item) => (
            <button
              key={item.locale}
              role="menuitem"
              onClick={() => switchTo(item.locale)}
              className={cn(
                'flex w-full items-center justify-between px-3 py-2 text-sm transition',
                'hover:bg-background-alt dark:hover:bg-white/5',
                item.locale === locale && 'text-primary'
              )}
            >
              <span className="font-medium">{item.label}</span>
              {item.locale === locale && (
                <span aria-hidden="true" className="text-primary">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

