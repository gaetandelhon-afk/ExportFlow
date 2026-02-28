import type { Metadata } from 'next';

import type { Locale } from '@/i18n/locales';
import { getSeo } from '@/lib/seo';
import { PricingPageClient } from './PricingPageClient';

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const seo = getSeo(locale, 'pricing');
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') ??
    'https://exportflow.io';

  return {
    title: seo.title,
    description: seo.description,
    ...(seo.keywords ? { keywords: seo.keywords } : {}),
    alternates: {
      canonical: `${base}/${locale}/pricing`
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: `${base}/${locale}/pricing`,
      siteName: 'ExportFlow',
      locale,
      type: 'website'
    }
  };
}

export default function PricingPage() {
  return <PricingPageClient />;
}

