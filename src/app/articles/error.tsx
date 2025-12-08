'use client';

import { SegmentError } from '@/components/error-boundary/segment-error';

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ArticlesSegmentError({ error, reset }: ErrorProps) {
  return (
    <SegmentError
      error={error}
      reset={reset}
      scope="articles:index:error"
      eyebrow="Articles Fault"
      title="We couldn't render the articles index."
      description="The writing archive stayed online, but loading this view failed. Retry, reload, or return home while we diagnose the request."
    />
  );
}
