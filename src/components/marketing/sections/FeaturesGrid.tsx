'use client';

import { useTranslations } from 'next-intl';

import { Card } from '@/components/marketing/ui/Card';
import { Container } from '@/components/marketing/ui/Container';
import { MotionInView } from '@/components/marketing/ui/MotionInView';

function FeatureCard({
  title,
  desc,
  bullets,
  delay
}: {
  title: string;
  desc: string;
  bullets: string[];
  delay: number;
}) {
  return (
    <MotionInView delay={delay}>
      <Card className="h-full p-6">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background-alt text-primary">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
              <path
                d="M7 12.5l3 3 7-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold">{title}</div>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              {desc}
            </p>
          </div>
        </div>

        <ul className="mt-5 space-y-2 text-sm text-text-secondary">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/70" />
              <span className="leading-relaxed">{b}</span>
            </li>
          ))}
        </ul>
      </Card>
    </MotionInView>
  );
}

export function FeaturesGrid() {
  const t = useTranslations('features');

  const features = [
    {
      title: t('feature_1_title'),
      desc: t('feature_1_desc'),
      bullets: t.raw('feature_1_bullets') as string[]
    },
    {
      title: t('feature_2_title'),
      desc: t('feature_2_desc'),
      bullets: t.raw('feature_2_bullets') as string[]
    },
    {
      title: t('feature_3_title'),
      desc: t('feature_3_desc'),
      bullets: t.raw('feature_3_bullets') as string[]
    },
    {
      title: t('feature_4_title'),
      desc: t('feature_4_desc'),
      bullets: t.raw('feature_4_bullets') as string[]
    },
    {
      title: t('feature_5_title'),
      desc: t('feature_5_desc'),
      bullets: t.raw('feature_5_bullets') as string[]
    },
    {
      title: t('feature_6_title'),
      desc: t('feature_6_desc'),
      bullets: t.raw('feature_6_bullets') as string[]
    }
  ];

  return (
    <section id="features">
      <Container className="py-16 sm:py-20">
        <MotionInView>
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            {t('section_title')}
          </h2>
        </MotionInView>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          {features.map((f, idx) => (
            <FeatureCard
              key={f.title}
              title={f.title}
              desc={f.desc}
              bullets={f.bullets}
              delay={idx * 0.03}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}

