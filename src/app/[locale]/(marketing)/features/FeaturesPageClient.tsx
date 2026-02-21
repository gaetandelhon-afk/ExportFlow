'use client';

import { useTranslations } from 'next-intl';

import { CTASection } from '@/components/sections/CTASection';
import { Card } from '@/components/ui/Card';
import { Container } from '@/components/ui/Container';
import { MotionInView } from '@/components/ui/MotionInView';

export function FeaturesPageClient() {
  const t = useTranslations('features');
  const items = t.raw('features_list') as Array<{
    id: string;
    title: string;
    description: string;
    benefits: string[];
  }>;

  return (
    <>
      <section className="bg-background">
        <Container className="py-14 sm:py-16">
          <MotionInView>
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              {t('page_title')}
            </h1>
            <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-text-secondary sm:text-lg">
              {t('page_subtitle')}
            </p>
          </MotionInView>
        </Container>
      </section>

      <section>
        <Container className="py-16 sm:py-20">
          <div className="grid gap-4 lg:grid-cols-2">
            {items.map((item, idx) => (
              <MotionInView key={item.id} delay={idx * 0.03}>
                <Card className="h-full p-6">
                  <div className="text-sm font-semibold">{item.title}</div>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                    {item.description}
                  </p>
                  <ul className="mt-5 space-y-2 text-sm text-text-secondary">
                    {item.benefits.map((b) => (
                      <li key={b} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/70" />
                        <span className="leading-relaxed">{b}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </MotionInView>
            ))}
          </div>
        </Container>
      </section>

      <CTASection />
    </>
  );
}

