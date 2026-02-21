import type { MetadataRoute } from 'next';

import { locales } from '@/i18n/locales';
import { getBaseUrl } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getBaseUrl();
  const lastModified = new Date();
  const paths = [
    '',
    '/features',
    '/pricing',
    '/signup',
    '/login',
    '/about',
    '/contact',
    '/privacy',
    '/terms',
    '/security'
  ];

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const path of paths) {
      entries.push({
        url: `${base}/${locale}${path}`,
        lastModified
      });
    }
  }

  return entries;
}

