'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

import { Badge } from '@/components/marketing/ui/Badge';
import { Button } from '@/components/marketing/ui/Button';
import { Card } from '@/components/marketing/ui/Card';
import { Container } from '@/components/marketing/ui/Container';
import { MotionInView } from '@/components/marketing/ui/MotionInView';
import { cn } from '@/lib/cn';
import { getPriceId, type PlanName, type BillingPeriod } from '@/lib/plans';

type Billing = 'monthly' | 'annual';

export function PricingPageClient() {
  const t = useTranslations('pricing');
  const locale = useLocale();
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [billing, setBilling] = useState<Billing>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(priceId: string, skipTrial: boolean) {
    if (!isLoaded) return;

    if (!user) {
      router.push('/sign-up');
      return;
    }

    setLoadingPlan(`${priceId}-${skipTrial}`);
    setError(null);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, skipTrial }),
      });

      if (res.status === 401) {
        router.push('/sign-in');
        return;
      }

      const data = (await res.json()) as { url?: string; error?: string };

      if (data.url) {
        window.location.assign(data.url);
        return;
      }

      setError(data.error || 'Something went wrong. Please try again.');
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoadingPlan(null);
    }
  }

  const plans = useMemo(() => {
    const raw = t.raw('plans') as Array<{
      name: string;
      description: string;
      price_monthly: string;
      price_annual: string;
      period: string;
      features: string[];
      cta: string;
      popular?: boolean;
      annual_only?: boolean;
    }>;

    return raw.map((p) => {
      const showAnnual = billing === 'annual';
      const price = showAnnual ? p.price_annual : p.price_monthly;
      const planKey = p.name.toLowerCase() as PlanName;
      const period: BillingPeriod = showAnnual ? 'yearly' : 'monthly';
      const priceId = getPriceId(planKey, period);
      return {
        ...p,
        price,
        planKey,
        priceId,
      };
    });
  }, [billing, t]);

  const faq = t.raw('faq') as Array<{ question: string; answer: string }>;

  return (
    <div className="bg-background">
      <Container className="py-14 sm:py-16">
        <MotionInView>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            {t('section_title')}
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-text-secondary sm:text-lg">
            {t('section_subtitle')}
          </p>
        </MotionInView>

        <div className="mt-8 flex items-center justify-start gap-3">
          <div className="inline-flex rounded-xl border border-border bg-background-alt p-1">
            <button
              onClick={() => setBilling('monthly')}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-semibold transition',
                billing === 'monthly'
                  ? 'bg-white text-text shadow-soft dark:bg-white/10'
                  : 'text-text-secondary hover:text-text'
              )}
            >
              {t('toggle_monthly')}
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-semibold transition',
                billing === 'annual'
                  ? 'bg-white text-text shadow-soft dark:bg-white/10'
                  : 'text-text-secondary hover:text-text'
              )}
            >
              {t('toggle_annual')}
            </button>
          </div>
          <Badge className="border-primary/20 bg-white/60 text-primary dark:bg-white/5">
            {t('save_badge')}
          </Badge>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-10 grid gap-4 lg:grid-cols-4">
          {plans.map((plan, idx) => (
            <MotionInView key={plan.name} delay={idx * 0.03}>
              <Card
                className={cn(
                  'h-full p-6',
                  plan.popular && 'border-primary/30'
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">{plan.name}</div>
                  {plan.popular && (
                    <Badge className="border-primary/30 bg-white/60 text-primary dark:bg-white/5">
                      {t('popular_badge')}
                    </Badge>
                  )}
                </div>
                <p className="mt-2 text-sm text-text-secondary">
                  {plan.description}
                </p>

                <div className="mt-6 flex items-end gap-2">
                  <div className="text-4xl font-semibold tracking-tight">
                    {plan.price}
                  </div>
                  <div className="pb-1 text-sm text-text-secondary">
                    {plan.period}
                  </div>
                </div>
                {plan.annual_only && (
                  <div className="mt-2 text-xs text-text-secondary">
                    {t('annual_only')}
                  </div>
                )}

                <ul className="mt-6 space-y-2 text-sm text-text-secondary">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/70" />
                      <span className="leading-relaxed">{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8">
                  {plan.cta.toLowerCase().includes('contact') || !plan.priceId ? (
                    <Link href={`/${locale}/contact`} className="block">
                      <Button
                        variant={plan.popular ? 'primary' : 'secondary'}
                        className="w-full"
                      >
                        {plan.cta}
                      </Button>
                    </Link>
                  ) : user ? (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Link href="/onboarding" className="block">
                        <Button variant="secondary" className="w-full">
                          Start Free Trial
                        </Button>
                      </Link>
                      <Button
                        variant="primary"
                        className="w-full"
                        disabled={loadingPlan !== null}
                        onClick={() => startCheckout(plan.priceId as string, true)}
                      >
                        {loadingPlan === `${plan.priceId}-true` ? 'Redirecting…' : 'Subscribe Now'}
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Link href="/sign-up" className="block">
                        <Button variant="secondary" className="w-full">
                          Start Free Trial
                        </Button>
                      </Link>
                      <Link href="/sign-up" className="block">
                        <Button variant="primary" className="w-full">
                          Get Started
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </Card>
            </MotionInView>
          ))}
        </div>

        <div className="mt-14 grid gap-4 lg:grid-cols-2">
          <MotionInView>
            <Card className="p-6">
              <div className="text-sm font-semibold">{t('price_tiers_title')}</div>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {t('price_tiers_description')}
              </p>
              <div className="mt-4 rounded-xl border border-border bg-background-alt p-4 text-sm text-text-secondary">
                {t('price_tiers_example')}
              </div>
            </Card>
          </MotionInView>

          <MotionInView>
            <Card className="p-6">
              <div className="text-sm font-semibold">{t('guarantee_title')}</div>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {t('guarantee_text')}
              </p>
            </Card>
          </MotionInView>
        </div>

        <div className="mt-14">
          <MotionInView>
            <h2 className="text-2xl font-semibold tracking-tight">FAQ</h2>
          </MotionInView>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {faq.map((item, idx) => (
              <MotionInView key={item.question} delay={idx * 0.02}>
                <Card className="p-6">
                  <div className="text-sm font-semibold">{item.question}</div>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                    {item.answer}
                  </p>
                </Card>
              </MotionInView>
            ))}
          </div>
        </div>
      </Container>
    </div>
  );
}

