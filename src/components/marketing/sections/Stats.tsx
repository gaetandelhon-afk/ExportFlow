'use client';

import { useTranslations } from 'next-intl';

import { Card } from '@/components/marketing/ui/Card';
import { Container } from '@/components/marketing/ui/Container';
import { MotionInView } from '@/components/marketing/ui/MotionInView';

export function Stats() {
  const t = useTranslations('stats');

  const stats = [
    { value: t('stat_1_value'), label: t('stat_1_label') },
    { value: t('stat_2_value'), label: t('stat_2_label') },
    { value: t('stat_3_value'), label: t('stat_3_label') },
    { value: t('stat_4_value'), label: t('stat_4_label') }
  ];

  return (
    <section className="bg-background-alt">
      <Container className="py-16 sm:py-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, idx) => (
            <MotionInView key={s.label} delay={idx * 0.03}>
              <Card className="p-6">
                <div className="text-3xl font-semibold tracking-tight">
                  {s.value}
                </div>
                <div className="mt-2 text-sm text-text-secondary">
                  {s.label}
                </div>
              </Card>
            </MotionInView>
          ))}
        </div>
      </Container>
    </section>
  );
}

