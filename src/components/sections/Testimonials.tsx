'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useRef } from 'react';

import { Card } from '@/components/ui/Card';
import { Container } from '@/components/ui/Container';

export function Testimonials() {
  const t = useTranslations('testimonials');
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const items = useMemo(() => {
    return t.raw('items') as Array<{
      quote: string;
      author: string;
      title: string;
      company: string;
      country: string;
      flag: string;
      highlight: string;
    }>;
  }, [t]);

  function scrollByCards(direction: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('[data-testimonial-card]');
    const cardWidth = card?.offsetWidth ?? Math.floor(el.clientWidth / 2);
    const gap = 16; // gap-4
    el.scrollBy({ left: direction * (cardWidth + gap), behavior: 'smooth' });
  }

  return (
    <section>
      <Container className="py-16 sm:py-20">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-text">Testimonials</div>
          <div className="hidden items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={() => scrollByCards(-1)}
              className="rounded-xl border border-border bg-background-alt px-3 py-2 text-sm font-semibold text-text-secondary transition hover:text-text"
              aria-label="Previous testimonials"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => scrollByCards(1)}
              className="rounded-xl border border-border bg-background-alt px-3 py-2 text-sm font-semibold text-text-secondary transition hover:text-text"
              aria-label="Next testimonials"
            >
              Next
            </button>
          </div>
        </div>

        <div
          ref={scrollerRef}
          className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => (
            <div
              key={item.quote}
              className="w-[calc(100%-0.0rem)] shrink-0 snap-start sm:w-[calc(50%-0.5rem)]"
              data-testimonial-card
            >
              <Card className="h-full p-6">
                <p className="text-sm leading-relaxed text-text-secondary">
                  “{item.quote}”
                </p>
                <div className="mt-4 text-sm font-semibold text-text">
                  {item.highlight}
                </div>
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background-alt text-sm font-semibold text-primary">
                    {item.author
                      .split(' ')
                      .slice(0, 2)
                      .map((p) => p[0])
                      .join('')}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">
                      {item.author}{' '}
                      <span className="text-text-secondary">{item.flag}</span>
                    </div>
                    <div className="text-xs text-text-secondary">
                      {item.title} • {item.company}
                    </div>
                    <div className="mt-1 text-xs text-text-secondary">
                      {item.country}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

