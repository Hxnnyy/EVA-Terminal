import Link from 'next/link';

import { ADMIN_FORBIDDEN_MESSAGE, ADMIN_SIGN_IN_MESSAGE } from '@/lib/auth/admin';
import type { AppPageProps } from '@/types/routes';

import styles from './forbidden.module.css';

type ForbiddenPageProps = AppPageProps;

export default async function ForbiddenPage({ searchParams }: ForbiddenPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const reasonParam = resolvedSearchParams?.reason;
  const reason =
    typeof reasonParam === 'string'
      ? reasonParam
      : Array.isArray(reasonParam)
        ? reasonParam[0]
        : 'admin';

  const messageParam = resolvedSearchParams?.message;
  const message =
    typeof messageParam === 'string'
      ? messageParam
      : reason === 'signin'
        ? ADMIN_SIGN_IN_MESSAGE
        : ADMIN_FORBIDDEN_MESSAGE;

  const fromParam = resolvedSearchParams?.from;
  const requestedFrom =
    typeof fromParam === 'string' ? fromParam : Array.isArray(fromParam) ? fromParam[0] : null;

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <p className={styles.eyebrow}>Access control</p>
        <h1 className={styles.title}>Access denied</h1>
        <p className={styles.message}>{message}</p>
        {requestedFrom ? (
          <p className={styles.from}>
            Requested URL: <code>{requestedFrom}</code>
          </p>
        ) : null}
        <div className={styles.actions}>
          <Link href="/" className={styles.cta}>
            Return to terminal
          </Link>
        </div>
        <p className={styles.footer}>
          Need access? Ask the site owner to grant the admin role to your account.
        </p>
      </section>
    </main>
  );
}
