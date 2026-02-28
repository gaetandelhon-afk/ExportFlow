import { getRequestConfig } from 'next-intl/server';

import { defaultLocale, locales } from './locales';

export default getRequestConfig(async ({ locale }) => {
  const resolvedLocale = locales.includes(locale as any)
    ? (locale as (typeof locales)[number])
    : defaultLocale;

  // Spec file doesn’t provide Turkish translations.
  // We still expose `/tr` but serve English messages as a safe fallback.
  const messageLocale = resolvedLocale === 'tr' ? 'en' : resolvedLocale;

  return {
    locale: resolvedLocale,
    messages: (await import(`../messages/${messageLocale}.json`)).default
  };
});

