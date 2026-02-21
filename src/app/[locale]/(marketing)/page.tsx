import type { Metadata } from 'next';

import { Hero } from '@/components/sections/Hero';
import { PainPoints } from '@/components/sections/PainPoints';
import { Solution } from '@/components/sections/Solution';
import { HomeFeatures } from '@/components/sections/HomeFeatures';
import { HowItWorks } from '@/components/sections/HowItWorks';
import { Testimonials } from '@/components/sections/Testimonials';
import { CTASection } from '@/components/sections/CTASection';
import { SoftwareAppJsonLd } from '@/components/seo/SoftwareAppJsonLd';
import type { Locale } from '@/i18n/locales';
import { getSeo } from '@/lib/seo';

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const seo = getSeo(locale, 'home');
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') ??
    'https://exportflow.io';

  return {
    title: seo.title,
    description: seo.description,
    ...(seo.keywords ? { keywords: seo.keywords } : {}),
    alternates: {
      canonical: `${base}/${locale}`,
      languages: {
        en: `${base}/en`,
        zh: `${base}/zh`,
        fr: `${base}/fr`,
        es: `${base}/es`,
        id: `${base}/id`,
        tr: `${base}/tr`
      }
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: `${base}/${locale}`,
      siteName: 'ExportFlow',
      locale,
      type: 'website'
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.title,
      description: seo.description
    }
  };
}

export default function HomePage() {
  return (
    <>
      <SoftwareAppJsonLd />
      <Hero />
      <PainPoints />
      <Solution />
      <HomeFeatures />
      <HowItWorks />
      <Testimonials />
      <CTASection />
    </>
  );
}

