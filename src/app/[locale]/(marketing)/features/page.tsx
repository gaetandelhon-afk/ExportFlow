import type { Metadata } from 'next';

import type { Locale } from '@/i18n/locales';
import { getSeo } from '@/lib/seo';
import { FeaturesPageClient } from './FeaturesPageClient';

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const seo = getSeo(locale, 'features');
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') ??
    'https://exportflow.io';

  return {
    title: seo.title,
    description: seo.description,
    ...(seo.keywords ? { keywords: seo.keywords } : {}),
    alternates: {
      canonical: `${base}/${locale}/features`
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: `${base}/${locale}/features`,
      siteName: 'ExportFlow',
      locale,
      type: 'website'
    }
  };
}

export default function FeaturesPage() {
  return <FeaturesPageClient />;
}

