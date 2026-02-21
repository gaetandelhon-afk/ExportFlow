'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';

import { HeroGridBackground } from '@/components/sections/HeroGridBackground';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';

export function Hero() {
  const t = useTranslations('hero');
  const core = useTranslations('core');
  const locale = useLocale();

  return (
    <section className="relative overflow-hidden">
      <HeroGridBackground />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background:
            'radial-gradient(900px 500px at 15% 10%, rgba(59,130,246,0.20), transparent 60%), radial-gradient(800px 450px at 80% 20%, rgba(139,92,246,0.18), transparent 55%), radial-gradient(700px 380px at 60% 80%, rgba(236,72,153,0.14), transparent 60%)'
        }}
      />

      <Container className="relative py-16 sm:py-20 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <Badge className="block w-fit max-w-full border-primary/20 bg-white/60 text-text-secondary dark:bg-white/5">
                {core('value_proposition')}
              </Badge>

              <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                {t('title')}{' '}
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: 'var(--gradient-brand)' }}
                >
                  {t('title_highlight')}
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-pretty text-base leading-relaxed text-text-secondary sm:text-lg">
                {t('subtitle')}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link href={`/${locale}/signup`}>
                  <Button size="lg" className="w-full sm:w-auto">
                    {t('cta_primary')}
                  </Button>
                </Link>
                <Link href={`/${locale}#how-it-works`}>
                  <Button
                    size="lg"
                    variant="secondary"
                    className="w-full sm:w-auto"
                  >
                    {t('cta_secondary')}
                  </Button>
                </Link>
              </div>

              <p className="mt-4 text-sm text-text-secondary">
                {t('note')}
              </p>
            </motion.div>
          </div>

          <div className="lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.7,
                ease: [0.22, 1, 0.36, 1],
                delay: 0.06
              }}
              className="rounded-2xl border border-border bg-white/70 p-5 shadow-soft backdrop-blur dark:bg-white/5"
            >
              <div className="rounded-xl border border-border bg-background-alt p-4">
                <div className="text-xs font-semibold text-text-secondary">
                  ExportFlow Portal
                </div>
                <div className="mt-3 grid gap-3">
                  {[
                    { title: 'Order #1043', meta: 'Pending deposit' },
                    { title: 'Order #1044', meta: 'In production' },
                    { title: 'Order #1045', meta: 'Ready to ship' }
                  ].map((row) => (
                    <div
                      key={row.title}
                      className="flex items-center justify-between rounded-xl border border-border bg-white px-4 py-3 dark:bg-white/5"
                    >
                      <div className="text-sm font-semibold">{row.title}</div>
                      <div className="text-xs text-text-secondary">
                        {row.meta}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-white/70 p-4 dark:bg-white/5">
                  <div className="text-xs text-text-secondary">Payments</div>
                  <div className="mt-2 text-lg font-semibold">+42%</div>
                </div>
                <div className="rounded-xl border border-border bg-white/70 p-4 dark:bg-white/5">
                  <div className="text-xs text-text-secondary">Order errors</div>
                  <div className="mt-2 text-lg font-semibold">-70%</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </Container>
    </section>
  );
}

