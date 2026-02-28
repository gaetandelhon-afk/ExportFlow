'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { LanguageSwitcher } from '@/components/marketing/layout/LanguageSwitcher';
import { Logo } from '@/components/marketing/layout/Logo';
import { ThemeToggle } from '@/components/marketing/layout/ThemeToggle';
import { Button } from '@/components/marketing/ui/Button';
import { Container } from '@/components/marketing/ui/Container';
import { cn } from '@/lib/cn';

export function Header() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = useMemo(
    () => [
      { href: `/${locale}/features`, label: t('features') },
      { href: `/${locale}/pricing`, label: t('pricing') }
    ],
    [locale, t]
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-white/70 backdrop-blur dark:bg-[#0b0b0f]/70">
      <div className="relative overflow-hidden border-b border-border/50">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-25"
          style={{ background: 'var(--gradient-brand)' }}
        />
        <div className="absolute inset-0 bg-white/75 dark:bg-white/10" />
        <Container className="relative flex h-10 items-center justify-center">
          <Link
            href="/sign-up"
            className="text-center text-sm font-semibold text-text hover:underline dark:text-white"
          >
            Start 14 Days Free Trial, no credit card required
          </Link>
        </Container>
      </div>
      <Container className="flex h-24 items-center justify-between">
        <div className="flex items-center gap-6">
          <Logo />

          <nav className="hidden items-center gap-5 md:flex">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'text-sm font-medium text-text-secondary transition hover:text-text',
                    active && 'text-text'
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <div className="hidden">
            <LanguageSwitcher />
          </div>
          <ThemeToggle />
          <Link href="/sign-in">
            <Button variant="ghost" size="sm">
              {t('login')}
            </Button>
          </Link>
          <Link href="/sign-up">
            <Button size="sm">{t('signup')}</Button>
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <div className="hidden">
            <LanguageSwitcher />
          </div>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 px-0"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
              <path
                d="M5 7h14M5 12h14M5 17h14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </Button>
        </div>
      </Container>

      {open && (
        <div className="border-t border-border/60 bg-white/80 dark:bg-[#0b0b0f]/80 md:hidden">
          <Container className="py-4">
            <div className="flex flex-col gap-2">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-2 text-sm font-medium text-text-secondary hover:bg-background-alt dark:hover:bg-white/5"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-2 flex gap-2">
                <Link className="flex-1" href="/sign-in" onClick={() => setOpen(false)}>
                  <Button className="w-full" variant="secondary" size="sm">
                    {t('login')}
                  </Button>
                </Link>
                <Link className="flex-1" href="/sign-up" onClick={() => setOpen(false)}>
                  <Button className="w-full" size="sm">
                    {t('signup')}
                  </Button>
                </Link>
              </div>
            </div>
          </Container>
        </div>
      )}
    </header>
  );
}

