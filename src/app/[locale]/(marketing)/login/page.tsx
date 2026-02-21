'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Container } from '@/components/ui/Container';
import { MotionInView } from '@/components/ui/MotionInView';

const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required')
});

export default function LoginPage() {
  const t = useTranslations('auth.login');
  const locale = useLocale();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid form');
      return;
    }

    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 550));
    setSubmitting(false);
    setError('Invalid credentials (demo).');
  }

  return (
    <Container className="py-14 sm:py-16">
      <div className="mx-auto max-w-xl">
        <MotionInView>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            {t('title')}
          </h1>
          <p className="mt-3 text-base text-text-secondary sm:text-lg">
            {t('subtitle')}
          </p>
        </MotionInView>

        <MotionInView delay={0.06}>
          <Card className="mt-8 p-6">
            <form onSubmit={onSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">{t('fields.email')}</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/20 dark:bg-white/5"
                  type="email"
                  autoComplete="email"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">
                  {t('fields.password')}
                </label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/20 dark:bg-white/5"
                  type="password"
                  autoComplete="current-password"
                />
              </div>

              <div className="flex justify-end">
                <Link className="text-sm text-primary hover:underline" href={`/${locale}/login#forgot`}>
                  {t('forgot')}
                </Link>
              </div>

              {error && (
                <div className="rounded-xl border border-border bg-background-alt px-4 py-3 text-sm text-text-secondary">
                  {error}
                </div>
              )}

              <Button className="w-full" size="lg" disabled={submitting}>
                {submitting ? '...' : t('submit')}
              </Button>

              <p className="text-sm text-text-secondary">
                <Link className="text-primary hover:underline" href={`/${locale}/signup`}>
                  {t('signup_link')}
                </Link>
              </p>
            </form>
          </Card>
        </MotionInView>
      </div>
    </Container>
  );
}

