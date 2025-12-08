'use client';

import { SegmentError } from '@/components/error-boundary/segment-error';

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function HomeError({ error, reset }: ErrorProps) {
  return (
    <SegmentError
      error={error}
      reset={reset}
      scope="home:error"
      eyebrow="Console Fault"
      title="Home terminal failed to load."
      description="The EVA terminal encountered an exception while rendering the home console. Retry or reload to restore the session."
    />
  );
}
