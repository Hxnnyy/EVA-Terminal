'use client';

import { SegmentError } from '@/components/error-boundary/segment-error';

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ProjectsSegmentError({ error, reset }: ErrorProps) {
  return (
    <SegmentError
      error={error}
      reset={reset}
      scope="projects:index:error"
      eyebrow="Projects Fault"
      title="We couldn't render the projects archive."
      description="The projects registry hit an exception. Retry the view or reload the console while we restore the archive."
    />
  );
}
