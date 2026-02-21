'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Container } from '@/components/ui/Container';
import { MotionInView } from '@/components/ui/MotionInView';

const signupSchema = z.object({
  company: z.string().min(1, 'Company is required'),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

type FormState = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const t = useTranslations('auth.signup');
  const locale = useLocale();

  const [form, setForm] = useState<FormState>({
    company: '',
    name: '',
    email: '',
    password: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const benefits = useMemo(
    () => (t.raw('benefits') as string[]),
    [t]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(false);

    const parsed = signupSchema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]?.toString() ?? 'form';
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }

    setErrors({});
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 650));
    setSubmitting(false);
    setSuccess(true);
  }

  return (
    <Container className="py-14 sm:py-16">
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <MotionInView>
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              {t('title')}
            </h1>
            <p className="mt-3 text-base text-text-secondary sm:text-lg">
              {t('subtitle')}
            </p>
          </MotionInView>

          <MotionInView delay={0.05}>
            <Card className="mt-8 p-6">
              <form onSubmit={onSubmit} className="grid gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">
                    {t('fields.company')}
                  </label>
                  <input
                    value={form.company}
                    onChange={(e) => setForm((s) => ({ ...s, company: e.target.value }))}
                    className="h-11 rounded-xl border border-border bg-white px-4 text-sm outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/20 dark:bg-white/5"
                    autoComplete="organization"
                  />
                  {errors.company && (
                    <div className="text-xs text-error">{errors.company}</div>
                  )}
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">
                    {t('fields.name')}
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, name: e.target.value }))
                    }
                    className="h-11 rounded-xl border border-border bg-white px-4 text-sm outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/20 dark:bg-white/5"
                    autoComplete="name"
                  />
                  {errors.name && (
                    <div className="text-xs text-error">{errors.name}</div>
                  )}
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">
                    {t('fields.email')}
                  </label>
                  <input
                    value={form.email}
                    onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                    className="h-11 rounded-xl border border-border bg-white px-4 text-sm outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/20 dark:bg-white/5"
                    type="email"
                    autoComplete="email"
                  />
                  {errors.email && (
                    <div className="text-xs text-error">{errors.email}</div>
                  )}
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">
                    {t('fields.password')}
                  </label>
                  <input
                    value={form.password}
                    onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                    className="h-11 rounded-xl border border-border bg-white px-4 text-sm outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/20 dark:bg-white/5"
                    type="password"
                    autoComplete="new-password"
                  />
                  {errors.password && (
                    <div className="text-xs text-error">{errors.password}</div>
                  )}
                </div>

                <div className="pt-2">
                  <Button className="w-full" size="lg" disabled={submitting}>
                    {submitting ? '...' : t('submit')}
                  </Button>
                  {success && (
                    <div className="mt-3 rounded-xl border border-border bg-background-alt px-4 py-3 text-sm font-medium text-text">
                      Success — account created (demo).
                    </div>
                  )}
                </div>

                <p className="text-sm text-text-secondary">
                  <Link className="text-primary hover:underline" href={`/${locale}/login`}>
                    {t('login_link')}
                  </Link>
                </p>
              </form>
            </Card>
          </MotionInView>
        </div>

        <div className="lg:col-span-5">
          <MotionInView delay={0.08}>
            <Card className="p-6">
              <ul className="mt-4 space-y-3 text-sm text-text-secondary">
                {benefits.map((b) => (
                  <li key={b} className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-background-alt text-primary">
                      <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4">
                        <path
                          d="M4.5 10.5l3.2 3.2L15.8 5.6"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <span className="leading-relaxed">{b}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </MotionInView>
        </div>
      </div>
    </Container>
  );
}

