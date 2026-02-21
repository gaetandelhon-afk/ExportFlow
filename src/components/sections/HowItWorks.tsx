'use client';

import { useTranslations } from 'next-intl';

import { Card } from '@/components/ui/Card';
import { Container } from '@/components/ui/Container';
import { MotionInView } from '@/components/ui/MotionInView';

export function HowItWorks() {
  const t = useTranslations('how_it_works');

  const steps = t.raw('steps') as Array<{
    number: string;
    title: string;
    description: string;
  }>;

  return (
    <section id="how-it-works" className="bg-background-alt">
      <Container className="py-16 sm:py-20">
        <MotionInView>
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            {t('section_title')}
          </h2>
        </MotionInView>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {steps.map((s, idx) => (
            <MotionInView key={s.title} delay={idx * 0.05}>
              <Card className="h-full p-6">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-background-alt text-sm font-semibold text-primary">
                  {s.number ?? idx + 1}
                </div>
                <div className="mt-4 text-sm font-semibold">{s.title}</div>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  {s.description}
                </p>
              </Card>
            </MotionInView>
          ))}
        </div>
      </Container>
    </section>
  );
}

