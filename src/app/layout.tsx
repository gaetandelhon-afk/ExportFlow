import type { Metadata } from 'next';

import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';

import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') ??
      'http://localhost:3000'
  ),
  title: 'ExportFlow',
  description:
    'The ordering portal that makes your export business look world-class.',
  icons: {
    icon: [{ url: '/favicon.png' }],
    apple: [{ url: '/apple-touch-icon.png' }]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  );
}

