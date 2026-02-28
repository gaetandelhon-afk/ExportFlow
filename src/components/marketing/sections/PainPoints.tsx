'use client';

import { useTranslations } from 'next-intl';

import { Card } from '@/components/marketing/ui/Card';
import { Container } from '@/components/marketing/ui/Container';
import { MotionInView } from '@/components/marketing/ui/MotionInView';

export function PainPoints() {
  const t = useTranslations('pain_points');

  const items = t.raw('items') as Array<{
    icon: string;
    title: string;
    description: string;
  }>;

  return (
    <section className="bg-background-alt">
      <Container className="py-16 sm:py-20">
        <MotionInView>
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            {t('section_title')}
          </h2>
        </MotionInView>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, idx) => (
            <MotionInView key={item.title} delay={idx * 0.03}>
              <Card className="h-full p-5">
                <div className="flex items-center gap-3">
                  <div className="text-lg">{item.icon}</div>
                  <div className="text-sm font-semibold">{item.title}</div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                  {item.description}
                </p>
              </Card>
            </MotionInView>
          ))}
        </div>
      </Container>
    </section>
  );
}

