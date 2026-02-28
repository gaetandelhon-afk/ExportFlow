'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/marketing/ui/Button';
import { Card } from '@/components/marketing/ui/Card';
import { Container } from '@/components/marketing/ui/Container';
import { MotionInView } from '@/components/marketing/ui/MotionInView';

export function HomeFeatures() {
  const t = useTranslations('features');
  const hero = useTranslations('hero');
  const locale = useLocale();

  const items = (t.raw('features_list') as Array<{
    id: string;
    title: string;
    description: string;
    benefits: string[];
  }>).slice(0, 4);

  return (
    <section>
      <Container className="py-16 sm:py-20">
        <MotionInView>
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            {t('page_title')}
          </h2>
          <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-text-secondary sm:text-lg">
            {t('page_subtitle')}
          </p>
        </MotionInView>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          {items.map((item, idx) => (
            <MotionInView key={item.id} delay={idx * 0.03}>
              <Card className="h-full p-6">
                <div className="text-sm font-semibold">{item.title}</div>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  {item.description}
                </p>
                <ul className="mt-5 space-y-2 text-sm text-text-secondary">
                  {item.benefits.slice(0, 3).map((b) => (
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

        <MotionInView>
          <div className="mt-10">
            <Link href={`/${locale}/features`}>
              <Button variant="secondary" size="lg">
                {hero('cta_secondary')}
              </Button>
            </Link>
          </div>
        </MotionInView>
      </Container>
    </section>
  );
}

