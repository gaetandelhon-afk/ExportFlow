'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/marketing/ui/Button';
import { Container } from '@/components/marketing/ui/Container';
import { MotionInView } from '@/components/marketing/ui/MotionInView';

export function CTASection() {
  const core = useTranslations('core');
  const hero = useTranslations('hero');
  const locale = useLocale();

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{ background: 'var(--gradient-brand)' }}
      />
      <Container className="relative py-16 sm:py-20">
        <MotionInView>
          <div className="mx-auto max-w-3xl text-center text-white">
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              {core('slogan')}
            </h2>
            <p className="mt-4 text-pretty text-base/7 text-white/85 sm:text-lg/8">
              {hero('subtitle')}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href="/sign-up">
                <Button
                  size="lg"
                  className="w-full bg-white text-text hover:bg-white/90 sm:w-auto"
                >
                  {hero('cta_primary')}
                </Button>
              </Link>
              <Link href={`/${locale}/features`}>
                <Button
                  size="lg"
                  variant="ghost"
                  className="w-full border border-white/25 bg-white/10 text-white hover:bg-white/15 sm:w-auto"
                >
                  {hero('cta_secondary')}
                </Button>
              </Link>
            </div>

            <p className="mt-4 text-sm text-white/80">{hero('note')}</p>
          </div>
        </MotionInView>
      </Container>
    </section>
  );
}

