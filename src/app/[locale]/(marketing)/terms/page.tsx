'use client';

import { Container } from '@/components/ui/Container';
import { MotionInView } from '@/components/ui/MotionInView';

export default function TermsPage() {
  return (
    <Container className="py-14 sm:py-16">
      <MotionInView>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Terms of Service
        </h1>
        <p className="mt-4 max-w-2xl text-base text-text-secondary sm:text-lg">
          This page is a placeholder for your terms of service content.
        </p>
      </MotionInView>
    </Container>
  );
}

