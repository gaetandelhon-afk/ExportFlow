import type { Locale } from '@/i18n/locales';

export function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') ?? 'https://exportflow.io'
  );
}

export function withLocale(locale: Locale, path: string) {
  const base = getBaseUrl();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}/${locale}${normalized === '/' ? '' : normalized}`;
}

