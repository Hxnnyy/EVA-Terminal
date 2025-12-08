'use client';

import { SegmentError } from '@/components/error-boundary/segment-error';

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ArticlesError({ error, reset }: Props) {
  return (
    <SegmentError
      error={error}
      reset={reset}
      scope="articles:detail:error"
      eyebrow="Article Load Failure"
      title="We couldn't render this article."
      description="The article feed stayed online, but this entry failed to render. Retry, reload, or jump back to the archive."
      actions={[
        { kind: 'reset', label: 'Retry view' },
        { kind: 'reload', label: 'Reload page' },
        { kind: 'link', label: 'Articles index', href: '/articles' },
        { kind: 'link', label: 'Return home', href: '/' },
        { kind: 'link', label: 'Admin console', href: '/admin' },
      ]}
    />
  );
}
