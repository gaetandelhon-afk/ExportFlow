'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';

import { Button } from '@/components/marketing/ui/Button';
import { Container } from '@/components/marketing/ui/Container';

export default function NotFound() {
  const locale = useLocale();

  return (
    <Container className="py-20">
      <div className="mx-auto max-w-xl text-center">
        <div className="text-sm font-semibold text-primary">404</div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          Page not found
        </h1>
        <p className="mt-4 text-base text-text-secondary sm:text-lg">
          The page you’re looking for doesn’t exist or has been moved.
        </p>
        <div className="mt-8 flex justify-center">
          <Link href={`/${locale}`}>
            <Button size="lg">Back to home</Button>
          </Link>
        </div>
      </div>
    </Container>
  );
}

