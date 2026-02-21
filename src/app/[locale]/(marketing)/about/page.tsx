'use client';

import { useTranslations } from 'next-intl';

import { Card } from '@/components/ui/Card';
import { Container } from '@/components/ui/Container';
import { MotionInView } from '@/components/ui/MotionInView';

export default function AboutPage() {
  const t = useTranslations('about');

  return (
    <Container className="py-14 sm:py-16">
      <MotionInView>
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          {t('title')}
        </h1>
        <p className="mt-4 max-w-3xl text-pretty text-base leading-relaxed text-text-secondary sm:text-lg">
          {t('story')}
        </p>
      </MotionInView>

      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        <MotionInView delay={0.04}>
          <Card className="p-6">
            <div className="text-sm font-semibold">{t('location')}</div>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              {t('short_story')}
            </p>
          </Card>
        </MotionInView>

        <MotionInView delay={0.06}>
          <Card className="p-6">
            <div className="text-sm font-semibold">{t('mission')}</div>
          </Card>
        </MotionInView>
      </div>
    </Container>
  );
}

