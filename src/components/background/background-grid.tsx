import clsx from 'clsx';

export function BackgroundGrid({ className }: { className?: string }) {
  return (
    <div className={clsx('background-grid', className)} aria-hidden role="presentation">
      <div className="background-grid__layer background-grid__layer--grid" />
      <div className="background-grid__layer background-grid__layer--stars" />
    </div>
  );
}
