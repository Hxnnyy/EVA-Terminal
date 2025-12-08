'use client';

import { SegmentError } from '@/components/error-boundary/segment-error';

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ProjectsError({ error, reset }: Props) {
  return (
    <SegmentError
      error={error}
      reset={reset}
      scope="projects:detail:error"
      eyebrow="Projects Module Fault"
      title="We couldn't render this project."
      description="The projects registry hit an exception. Retry the view, reload, or return to another area while we recover."
      actions={[
        { kind: 'reset', label: 'Retry view' },
        { kind: 'reload', label: 'Reload page' },
        { kind: 'link', label: 'Projects index', href: '/projects' },
        { kind: 'link', label: 'Return home', href: '/' },
        { kind: 'link', label: 'Admin console', href: '/admin' },
      ]}
    />
  );
}
