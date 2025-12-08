import type { AdminMetric } from '@/features/admin/types';

import styles from './admin-metrics.module.css';

type Props = {
  metrics: AdminMetric[];
};

export function AdminMetrics({ metrics }: Props) {
  if (!metrics.length) {
    return null;
  }

  return (
    <div className={styles.metrics}>
      {metrics.map((metric) => (
        <article key={metric.label} className={styles.metric} data-tone={metric.tone ?? 'default'}>
          <p className={styles.metricLabel}>{metric.label}</p>
          <p className={styles.metricValue}>{metric.value}</p>
          {metric.meta ? <p className={styles.metricMeta}>{metric.meta}</p> : null}
        </article>
      ))}
    </div>
  );
}
