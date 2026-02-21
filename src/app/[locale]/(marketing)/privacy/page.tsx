'use client';

import { Container } from '@/components/ui/Container';
import { MotionInView } from '@/components/ui/MotionInView';

export default function PrivacyPage() {
  return (
    <Container className="py-14 sm:py-16">
      <MotionInView>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-4 max-w-2xl text-base text-text-secondary sm:text-lg">
          This page is a placeholder for your legal policy content.
        </p>
      </MotionInView>
    </Container>
  );
}

