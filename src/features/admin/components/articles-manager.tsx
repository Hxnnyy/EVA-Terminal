'use client';

import clsx from 'clsx';
import React, { useEffect, useMemo, useState } from 'react';

import { AdminApiError, adminFetchJson, createAdminFetcher } from '@/lib/admin/fetch-json';
import { AdminArticleSchema } from '@/lib/schemas';

import cardStyles from './admin-card.module.css';
import formStyles from './admin-form.module.css';
import { AdminList, type AdminListColumn, type AdminListRow } from './admin-list';

type ArticleRecord = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  status: 'draft' | 'published';
  updatedAt: string | null;
  body: string;
};

type Props = {
  initialArticles: ArticleRecord[];
};

type ArticleFormState = {
  title: string;
  slug: string;
  subtitle: string;
  status: 'draft' | 'published';
  body: string;
};

type ArticleApiArticle = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  status?: 'draft' | 'published' | null;
  body_mdx?: string | null;
  updated_at?: string | null;
};

const emptyFormState = (): ArticleFormState => ({
  title: '',
  slug: '',
  subtitle: '',
  status: 'draft',
  body: '',
});

export function ArticlesManager({ initialArticles }: Props) {
  const [articles, setArticles] = useState<ArticleRecord[]>(() => sortArticles(initialArticles));
  const [form, setForm] = useState<ArticleFormState>(emptyFormState);
  const [fileLabel, setFileLabel] = useState<string>('Choose .md/.mdx file');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadingArticleId, setLoadingArticleId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [inlineErrors, setInlineErrors] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);
  const loadArticle = useMemo(() => createAdminFetcher(), []);

  useEffect(() => loadArticle.cancel, [loadArticle]);

  useEffect(() => {
    if (!touched) {
      return;
    }
    const handle = window.setTimeout(() => {
      const parsed = AdminArticleSchema.safeParse({
        slug: sanitizeSlug(form.slug),
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        body: form.body.trim(),
        status: form.status,
      });
      setInlineErrors(parsed.success ? [] : parsed.error.issues.map((issue) => issue.message));
    }, 240);
    return () => window.clearTimeout(handle);
  }, [form, touched]);

  const isEditing = editingId !== null;
  const submitLabel = isEditing ? 'Save Changes' : 'Publish Article';

  const listColumns: AdminListColumn<ArticleRecord>[] = useMemo(
    () => [
      {
        key: 'title',
        label: 'Title',
        className: 'admin-list__cell--truncate',
        render: (article) => article.title,
      },
      {
        key: 'slug',
        label: 'Slug',
        width: '180px',
        className: 'admin-list__cell--truncate',
        render: (article) => article.slug,
      },
      {
        key: 'status',
        label: 'Status',
        width: '120px',
        render: (article) => article.status,
      },
      {
        key: 'updatedAt',
        label: 'Updated',
        width: '140px',
        align: 'right',
        render: (article) => formatTimestamp(article.updatedAt),
      },
    ],
    [],
  );

  const handleInputChange = <K extends keyof ArticleFormState>(
    key: K,
    value: ArticleFormState[K],
  ) => {
    setTouched(true);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submitArticle = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    setStatus('saving');
    setError(null);
    setInlineErrors([]);
    try {
      const payload = {
        title: form.title.trim(),
        slug: sanitizeSlug(form.slug),
        subtitle: form.subtitle.trim() || null,
        status: form.status,
        body_mdx: form.body.trim(),
      };

      if (!payload.body_mdx) {
        setStatus('idle');
        setInlineErrors(['Body is required.']);
        setError('Import an .md/.mdx file before publishing.');
        return;
      }

      const parsed = AdminArticleSchema.safeParse({
        slug: payload.slug,
        title: payload.title,
        subtitle: payload.subtitle,
        body: payload.body_mdx,
        status: payload.status,
      });

      if (!parsed.success) {
        setStatus('idle');
        setInlineErrors(parsed.error.issues.map((issue) => issue.message));
        setError('Fix the validation errors before saving.');
        return;
      }

      const endpoint =
        isEditing && editingId ? '/api/admin/articles/' + editingId : '/api/admin/articles';
      const method = isEditing ? 'PUT' : 'POST';
      const json = await adminFetchJson<{ article: ArticleApiArticle }>(endpoint, {
        method,
        body: payload,
      });
      const nextArticle = mapArticle(json.article);
      setArticles((prev) =>
        sortArticles(
          isEditing
            ? prev.map((article) => (article.id === editingId ? nextArticle : article))
            : [nextArticle, ...prev],
        ),
      );
      setForm(emptyFormState());
      setEditingId(null);
      setFileLabel('Choose .md/.mdx file');
      setInlineErrors([]);
      setTouched(false);
      setError(null);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      const details = err instanceof AdminApiError ? extractArticleErrorDetails(err.payload) : [];
      if (details.length) {
        setInlineErrors(details);
      }
      setError(err instanceof AdminApiError ? err.message : 'Failed to save article.');
    } finally {
      setStatus('idle');
    }
  };

  const deleteArticle = async (id: string) => {
    setError(null);
    try {
      await adminFetchJson(`/api/admin/articles/${id}`, { method: 'DELETE' });
      setArticles((prev) => prev.filter((article) => article.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setForm(emptyFormState());
        setInlineErrors([]);
        setTouched(false);
        setFileLabel('Choose .md/.mdx file');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      setError(err instanceof AdminApiError ? err.message : 'Failed to delete article.');
    }
  };

  const beginEdit = async (article: ArticleRecord) => {
    setError(null);
    let target = article;
    if (!article.body?.trim()) {
      setLoadingArticleId(article.id);
      try {
        const json = await loadArticle<{ article: ArticleApiArticle }>(
          `/api/admin/articles/${article.id}`,
        );
        target = mapArticle(json.article);
        setArticles((prev) =>
          sortArticles(prev.map((record) => (record.id === target.id ? target : record))),
        );
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        setError(err instanceof AdminApiError ? err.message : 'Failed to load article.');
        return;
      } finally {
        setLoadingArticleId(null);
      }
    }

    setEditingId(target.id);
    setForm({
      title: target.title,
      slug: target.slug,
      subtitle: target.subtitle ?? '',
      status: target.status,
      body: target.body,
    });
    setInlineErrors([]);
    setTouched(false);
    setError(null);
    setFileLabel('Choose .md/.mdx file');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyFormState());
    setError(null);
    setInlineErrors([]);
    setTouched(false);
    setFileLabel('Choose .md/.mdx file');
  };

  const importMdx = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      setTouched(true);
      setForm((prev) => ({
        ...prev,
        body: text,
        slug: prev.slug || generateSlugFromFile(file.name),
        title: prev.title || inferTitleFromFile(file.name),
      }));
      setFileLabel(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to read MDX file.');
    } finally {
      event.target.value = '';
    }
  };

  const summary = useMemo(() => {
    if (!articles.length) {
      return 'No articles yet';
    }
    const drafts = articles.filter((article) => article.status === 'draft').length;
    return articles.length + ' total / ' + drafts + ' draft' + (drafts === 1 ? '' : 's');
  }, [articles]);

  const listRows: AdminListRow<ArticleRecord>[] = articles.map((article) => ({
    id: article.id,
    data: article,
    actionsLabel: `Actions for ${article.title}`,
    actions: [
      {
        label: loadingArticleId === article.id ? 'Loading...' : 'Edit',
        ariaLabel: `Edit ${article.title}`,
        disabled: loadingArticleId === article.id || status === 'saving',
        onClick: () => void beginEdit(article),
      },
      {
        label: 'Delete',
        ariaLabel: `Delete ${article.title}`,
        variant: 'danger',
        disabled: status === 'saving',
        onClick: () => void deleteArticle(article.id),
      },
    ],
  }));

  return (
    <section className={clsx('admin-card admin-card--wide admin-card--stack', cardStyles.card)}>
      <header className={clsx('admin-card__header', cardStyles.header)}>
        <div>
          <h3 className={clsx('admin-card__title', cardStyles.title)}>Articles</h3>
          <p className={clsx('admin-card__description', cardStyles.description)}>
            Publish new articles, upload files, or revise existing posts.
          </p>
        </div>
        <span
          className={clsx('admin-card__pill admin-card__pill--spaced', cardStyles.pill)}
          aria-live="polite"
        >
          {summary}
        </span>
      </header>
      <AdminList
        columns={listColumns}
        rows={listRows}
        actionsWidth="200px"
        emptyLabel="No articles yet."
      />

      <form
        className={clsx('admin-form', formStyles.form, formStyles.twoCol)}
        onSubmit={submitArticle}
      >
        <div className="admin-form__split">
          <strong>{isEditing ? 'Editing article' : 'New article'}</strong>
          {isEditing ? (
            <button type="button" onClick={cancelEdit} disabled={status === 'saving'}>
              Cancel edit
            </button>
          ) : null}
        </div>
        <label>
          Title
          <input
            value={form.title}
            onChange={(event) => handleInputChange('title', event.target.value)}
            required
          />
        </label>
        <label>
          Slug
          <input
            value={form.slug}
            onChange={(event) => handleInputChange('slug', event.target.value)}
            placeholder="e.g. eva-terminal-refresh"
            required
          />
        </label>
        <label>
          Subtitle
          <input
            value={form.subtitle}
            onChange={(event) => handleInputChange('subtitle', event.target.value)}
            placeholder="Optional"
          />
        </label>
        <label>
          Status
          <select
            value={form.status}
            onChange={(event) =>
              handleInputChange('status', event.target.value as 'draft' | 'published')
            }
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </label>
        <div className="admin-upload">
          <label className="admin-upload__button">
            Import .md/.mdx file
            <input type="file" accept=".md,.mdx,text/markdown" onChange={importMdx} />
          </label>
          <span className="admin-upload__filename">{fileLabel}</span>
        </div>
        {error || inlineErrors.length ? (
          <div className="admin-inline-notice" role="alert" aria-live="polite">
            {error ? <p className={clsx('admin-form__error', formStyles.error)}>{error}</p> : null}
            {inlineErrors.length ? (
              <ul className={clsx('admin-form__error', formStyles.error)}>
                {inlineErrors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        <button type="submit" className="admin-button-accent" disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving...' : submitLabel}
        </button>
      </form>
    </section>
  );
}

function sanitizeSlug(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return '';
  }
  return normalized
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateSlugFromFile(fileName: string) {
  const base = fileName.replace(/\.[^/.]+$/, '');
  return sanitizeSlug(base);
}

function extractArticleErrorDetails(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }
  const details = (payload as { details?: unknown }).details;
  if (!Array.isArray(details)) {
    return [];
  }
  return details
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function inferTitleFromFile(fileName: string) {
  const base = fileName.replace(/\.[^/.]+$/, '');
  if (!base) {
    return '';
  }
  return base
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^./, (char) => char.toUpperCase());
}

function mapArticle(payload: ArticleApiArticle): ArticleRecord {
  return {
    id: payload.id,
    slug: payload.slug,
    title: payload.title,
    subtitle: payload.subtitle,
    status: (payload.status as 'draft' | 'published') ?? 'draft',
    updatedAt: payload.updated_at ?? null,
    body: payload.body_mdx ?? '',
  };
}

function sortArticles(records: ArticleRecord[]) {
  return [...records].sort((a, b) => getTime(b.updatedAt) - getTime(a.updatedAt));
}

function getTime(value: string | null) {
  if (!value) {
    return 0;
  }
  const time = Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
