'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Container } from '@/components/ui/Container';
import { MotionInView } from '@/components/ui/MotionInView';

export default function ContactPage() {
  const t = useTranslations('contact');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setSent(false);
    await new Promise((r) => setTimeout(r, 650));
    setSending(false);
    setSent(true);
  }

  return (
    <Container className="py-14 sm:py-16">
      <MotionInView>
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          {t('page_title')}
        </h1>
        <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-text-secondary sm:text-lg">
          {t('page_subtitle')}
        </p>
      </MotionInView>

      <div className="mt-10 grid gap-4 lg:grid-cols-12">
        <MotionInView className="lg:col-span-7">
          <Card className="p-6">
            <form onSubmit={onSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">{t('form.name')}</label>
                <input className="h-11 rounded-xl border border-border bg-white px-4 text-sm outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/20 dark:bg-white/5" />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">{t('form.email')}</label>
                  <input className="h-11 rounded-xl border border-border bg-white px-4 text-sm outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/20 dark:bg-white/5" />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">{t('form.company')}</label>
                  <input className="h-11 rounded-xl border border-border bg-white px-4 text-sm outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/20 dark:bg-white/5" />
                </div>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">{t('form.message')}</label>
                <textarea className="min-h-28 rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/20 dark:bg-white/5" />
              </div>

              <Button size="lg" disabled={sending}>
                {sending ? '...' : t('form.submit')}
              </Button>

              {sent && (
                <div className="rounded-xl border border-border bg-background-alt px-4 py-3 text-sm text-text-secondary">
                  Sent (demo). We will reply by email.
                </div>
              )}
            </form>
          </Card>
        </MotionInView>

        <MotionInView className="lg:col-span-5" delay={0.04}>
          <Card className="p-6">
            <div className="text-sm font-semibold">{t('email')}</div>
            <a className="mt-2 block text-sm text-primary hover:underline" href="mailto:hello@exportflow.io">
              hello@exportflow.io
            </a>
            <div className="mt-3 text-sm text-text-secondary">{t('response_time')}</div>

            <div className="mt-8">
              <div className="text-sm font-semibold">{t('wechat_title')}</div>
              <div className="mt-2 text-sm text-text-secondary">{t('wechat_subtitle')}</div>
              <div className="mt-4 rounded-xl border border-border bg-background-alt p-6 text-center text-sm text-text-secondary">
                Placeholder
              </div>
            </div>
          </Card>
        </MotionInView>
      </div>
    </Container>
  );
}

