'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

import { Container } from '@/components/marketing/ui/Container';

export function Footer() {
  const t = useTranslations('footer');
  const about = useTranslations('about');
  const locale = useLocale();

  function hrefFor(label: string) {
    const normalized = label.toLowerCase();
    if (normalized.includes('feature') || label === '功能') return `/${locale}/features`;
    if (normalized.includes('pricing') || label === '定价') return `/${locale}/pricing`;
    if (normalized.includes('about') || label === '关于我们') return `/${locale}/about`;
    if (normalized.includes('contact') || label === '联系我们') return `/${locale}/contact`;
    if (normalized.includes('privacy') || label === '隐私政策') return `/${locale}/privacy`;
    if (normalized.includes('terms') || label === '服务条款') return `/${locale}/terms`;
    return '#';
  }

  return (
    <footer className="border-t border-border/70 bg-background">
      <Container className="py-12">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="text-sm font-semibold tracking-tight">ExportFlow</div>
            <p className="mt-3 max-w-sm text-sm text-text-secondary">
              {t('tagline')}
            </p>
            <p className="mt-3 max-w-sm text-sm text-text-secondary">
              {about('short_story')}
            </p>
            <p className="mt-3 max-w-sm text-sm text-text-secondary">
              {about('location')}
            </p>
            <p className="mt-3 max-w-sm text-sm text-text-secondary">
              <a className="hover:text-text" href="mailto:hello@exportflow.io">
                hello@exportflow.io
              </a>
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 md:col-span-7 md:grid-cols-4">
            {(['product', 'resources', 'company', 'legal'] as const).map((key) => {
              const col = t.raw(key) as { title: string; links: string[] };
              return (
                <div key={key}>
                  <div className="text-sm font-semibold">{col.title}</div>
                  <ul className="mt-3 space-y-2 text-sm text-text-secondary">
                    {col.links.map((label) => (
                      <li key={label}>
                        <Link className="hover:text-text" href={hrefFor(label)}>
                          {label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-border/70 pt-6 text-xs text-text-secondary sm:flex-row sm:items-center sm:justify-between">
          <div>{t('copyright')}</div>
          <div className="opacity-80">exportflow.io</div>
        </div>
      </Container>
    </footer>
  );
}

