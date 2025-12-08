'use client';

import clsx from 'clsx';
import React, { useEffect, useMemo, useState } from 'react';

import type { AdminLink } from '@/features/admin/types';
import { AdminApiError, adminFetchJson } from '@/lib/admin/fetch-json';
import { AdminLinkSchema } from '@/lib/schemas';

import cardStyles from './admin-card.module.css';
import formStyles from './admin-form.module.css';
import { AdminList, type AdminListColumn, type AdminListRow } from './admin-list';
import styles from './links-manager.module.css';

type LinkRecord = AdminLink;

type Props = {
  initialLinks: LinkRecord[];
};

export function LinksManager({ initialLinks }: Props) {
  const [links, setLinks] = useState<LinkRecord[]>(() => sortLinks(initialLinks));
  const [form, setForm] = useState<Omit<LinkRecord, 'id'>>({
    category: 'social',
    label: '',
    url: '',
    order: nextLinkOrder(initialLinks),
  });
  const linkCountLabel = `${links.length} link${links.length === 1 ? '' : 's'}`;
  const [status, setStatus] = useState<'idle' | 'saving'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [inlineErrors, setInlineErrors] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!touched) {
      return;
    }
    const handle = window.setTimeout(() => {
      const parsed = AdminLinkSchema.safeParse(form);
      setInlineErrors(parsed.success ? [] : parsed.error.issues.map((issue) => issue.message));
    }, 220);
    return () => window.clearTimeout(handle);
  }, [form, touched]);

  const sortedLinks = useMemo(() => sortLinks(links), [links]);
  const listColumns: AdminListColumn<LinkRecord>[] = useMemo(
    () => [
      {
        key: 'label',
        label: 'Label',
        className: 'admin-list__cell--truncate',
        render: (link) => link.label,
      },
      {
        key: 'category',
        label: 'Category',
        width: '120px',
        render: (link) => link.category,
      },
      {
        key: 'url',
        label: 'URL',
        className: 'admin-list__cell--truncate',
        render: (link) => link.url,
      },
      {
        key: 'order',
        label: 'Order',
        width: '88px',
        align: 'center',
        className: 'admin-list__order',
        render: (link) => link.order,
      },
    ],
    [],
  );

  const submitLink = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    const parsed = AdminLinkSchema.safeParse(form);
    if (!parsed.success) {
      setError('Fix the validation errors before saving.');
      setInlineErrors(parsed.error.issues.map((issue) => issue.message));
      return;
    }
    setStatus('saving');
    setError(null);
    setInlineErrors([]);
    try {
      const json = await adminFetchJson<{ link: LinkRecord }>('/api/admin/links', {
        method: 'POST',
        body: form,
      });
      setLinks((prev) => {
        const next = sortLinks([...prev, json.link]);
        setForm({
          category: 'social',
          label: '',
          url: '',
          order: nextLinkOrder(next),
        });
        return next;
      });
      setTouched(false);
      setInlineErrors([]);
    } catch (err) {
      const messages = resolveLinkError(err, 'Failed to create link.');
      setError('Failed to create link.');
      setInlineErrors(messages);
    } finally {
      setStatus('idle');
    }
  };

  const moveLink = async (id: string, direction: 'up' | 'down') => {
    const currentIndex = sortedLinks.findIndex((link) => link.id === id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex === -1 || targetIndex < 0 || targetIndex >= sortedLinks.length) {
      return;
    }

    const reordered = [...sortedLinks];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    const reindexed = reordered.map((link, idx) => ({ ...link, order: idx + 1 }));
    setLinks(reindexed);

    try {
      const changed = reindexed.filter(
        (link, idx) => link.order !== sortedLinks[idx]?.order || link.id !== sortedLinks[idx]?.id,
      );
      await Promise.all(
        changed.map((link) =>
          adminFetchJson(`/api/admin/links/${link.id}`, {
            method: 'PUT',
            body: { order: link.order },
          }),
        ),
      );
    } catch (err) {
      const messages = resolveLinkError(err, 'Failed to reorder link.');
      setError('Failed to reorder link.');
      setInlineErrors(messages);
      setLinks(sortedLinks);
    }
  };

  const deleteLink = async (id: string) => {
    try {
      await adminFetchJson(`/api/admin/links/${id}`, { method: 'DELETE' });
      setLinks((prev) => sortLinks(prev.filter((link) => link.id !== id)));
    } catch (err) {
      const messages = resolveLinkError(err, 'Failed to delete link.');
      setError('Failed to delete link.');
      setInlineErrors(messages);
    }
  };

  const listRows: AdminListRow<LinkRecord>[] = sortedLinks.map((link, index) => ({
    id: link.id,
    data: link,
    actionsLabel: `Actions for ${link.label}`,
    actions: [
      {
        label: 'Up',
        ariaLabel: `Move ${link.label} up`,
        variant: 'ghost',
        disabled: index === 0,
        onClick: () => moveLink(link.id, 'up'),
      },
      {
        label: 'Down',
        ariaLabel: `Move ${link.label} down`,
        variant: 'ghost',
        disabled: index === sortedLinks.length - 1,
        onClick: () => moveLink(link.id, 'down'),
      },
      {
        label: 'Delete',
        ariaLabel: `Delete ${link.label}`,
        variant: 'danger',
        onClick: () => void deleteLink(link.id),
      },
    ],
  }));

  return (
    <section
      className={clsx('admin-card admin-card--wide admin-card--stack', cardStyles.card)}
      role="region"
      aria-label="Links manager"
    >
      <header className={clsx('admin-card__header', cardStyles.header)}>
        <div>
          <h3 className={clsx('admin-card__title', cardStyles.title)}>Links</h3>
          <p className={clsx('admin-card__description', cardStyles.description)}>
            Add your personal and professional links for Option 3.
          </p>
        </div>
        <span className={clsx('admin-card__pill', cardStyles.pill)}>{linkCountLabel}</span>
      </header>
      <AdminList
        columns={listColumns}
        rows={listRows}
        actionsWidth="200px"
        emptyLabel="No links yet."
      />
      <form
        className={clsx('admin-form', formStyles.form, formStyles.twoCol, styles.form)}
        noValidate
        onSubmit={submitLink}
      >
        <label>
          Label
          <input
            value={form.label}
            onChange={(event) => {
              setTouched(true);
              setForm((prev) => ({ ...prev, label: event.target.value }));
            }}
            required
          />
        </label>
        <label>
          URL
          <input
            type="url"
            value={form.url}
            onChange={(event) => {
              setTouched(true);
              setForm((prev) => ({ ...prev, url: event.target.value }));
            }}
            required
          />
        </label>
        <label>
          Category
          <select
            value={form.category}
            onChange={(event) =>
              setForm((prev) => {
                setTouched(true);
                return {
                  ...prev,
                  category: event.target.value as LinkRecord['category'],
                };
              })
            }
          >
            <option value="social">Social</option>
            <option value="site">Site</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>
          Order
          <input
            type="number"
            value={form.order}
            onChange={(event) =>
              setForm((prev) => {
                setTouched(true);
                return {
                  ...prev,
                  order: Number(event.target.value),
                };
              })
            }
          />
        </label>
        {error || inlineErrors.length ? (
          <div className="admin-inline-notice" role="alert" aria-live="polite">
            {error ? (
              <p className={clsx('admin-form__error', formStyles.error, styles.error)}>{error}</p>
            ) : null}
            {inlineErrors.length ? (
              <ul className={clsx('admin-form__error', formStyles.error, styles.error)}>
                {inlineErrors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        <button type="submit" className="admin-button-accent" disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving...' : 'Add Link'}
        </button>
      </form>
    </section>
  );
}

function sortLinks(records: LinkRecord[]) {
  return [...records].sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    return a.label.localeCompare(b.label);
  });
}

function nextLinkOrder(records: LinkRecord[]) {
  if (!records.length) {
    return 1;
  }
  return Math.max(...records.map((record) => record.order ?? 0)) + 1;
}

function resolveLinkError(error: unknown, fallback: string): string[] {
  if (error instanceof AdminApiError) {
    const payload = error.payload as { details?: unknown };
    const details = Array.isArray(payload?.details)
      ? payload.details.filter((item): item is string => typeof item === 'string')
      : [];
    if (details.length) {
      return details;
    }
    return [error.message];
  }
  if (error instanceof Error) {
    return [error.message];
  }
  return [fallback];
}
