export const locales = ['en', 'zh', 'fr', 'es', 'id', 'tr'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

