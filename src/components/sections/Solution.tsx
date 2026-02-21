'use client';

import { useTranslations } from 'next-intl';

import { Container } from '@/components/ui/Container';
import { MotionInView } from '@/components/ui/MotionInView';

export function Solution() {
  const t = useTranslations('solution');

  const benefits = t.raw('benefits') as Array<{
    icon: string;
    title: string;
    description: string;
  }>;

  return (
    <section>
      <Container className="py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <MotionInView>
              <div className="text-sm font-semibold text-primary">
                {t('section_title')}
              </div>
              <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-text-secondary sm:text-lg">
                {t('section_subtitle')}
              </p>
            </MotionInView>
          </div>

          <div className="lg:col-span-6">
            <div className="grid gap-3">
              {benefits.map((b, idx) => (
                <MotionInView key={b.title} delay={idx * 0.03}>
                  <div className="flex items-start gap-3 rounded-2xl border border-border bg-white/70 p-4 shadow-soft backdrop-blur dark:bg-white/5">
                    <div className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background-alt text-lg">
                      {b.icon}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{b.title}</div>
                      <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                        {b.description}
                      </p>
                    </div>
                  </div>
                </MotionInView>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

