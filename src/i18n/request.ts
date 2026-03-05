import { getRequestConfig } from 'next-intl/server';

import { defaultLocale, locales } from './locales';

export default getRequestConfig(async ({ requestLocale }) => {
  // next-intl v4: requestLocale is a Promise — must be awaited
  // For non-locale routes (e.g. /sign-in), this resolves to undefined → fallback to 'en'
  const requested = await requestLocale;

  const resolvedLocale = requested && locales.includes(requested as any)
    ? (requested as (typeof locales)[number])
    : defaultLocale;

  // No Turkish translations — serve English as safe fallback
  const messageLocale = resolvedLocale === 'tr' ? 'en' : resolvedLocale;

  return {
    locale: resolvedLocale,
    messages: (await import(`../messages/${messageLocale}.json`)).default
  };
});
