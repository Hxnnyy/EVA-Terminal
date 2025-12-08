'use client';

import { SegmentError } from '@/components/error-boundary/segment-error';

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <SegmentError
      error={error}
      reset={reset}
      scope="app:error"
      eyebrow="System Fault"
      title="We hit an unexpected exception."
      description="The terminal stayed online, but this view failed to render. Retry or reload the console. If this keeps happening, share the request ID with the operator."
    />
  );
}
