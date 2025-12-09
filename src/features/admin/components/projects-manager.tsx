'use client';

import clsx from 'clsx';
import React, { useEffect, useMemo, useState } from 'react';

import { AdminApiError, adminFetchJson } from '@/lib/admin/fetch-json';
import { parseTags } from '@/lib/admin/tags';
import { env } from '@/lib/env';
import { AdminProjectSchema } from '@/lib/schemas';

import cardStyles from './admin-card.module.css';
import formStyles from './admin-form.module.css';
import { AdminList, type AdminListColumn, type AdminListRow } from './admin-list';

type ProjectRecord = {
  id: string;
  slug: string | null;
  title: string;
  blurb: string | null;
  url: string | null;
  tags: string[];
  order: number;
};

type Props = {
  initialProjects: ProjectRecord[];
};

const PROJECT_MDX_BUCKET = env.NEXT_PUBLIC_SUPABASE_PROJECT_MDX_BUCKET;

export function ProjectsManager({ initialProjects }: Props) {
  const [projects, setProjects] = useState<ProjectRecord[]>(initialProjects);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    slug: '',
    blurb: '',
    url: '',
    tags: '',
    fileName: '',
  });
  const [status, setStatus] = useState<'idle' | 'saving' | 'removing'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [inlineErrors, setInlineErrors] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);
  const [caseStudyFile, setCaseStudyFile] = useState<File | null>(null);
  const [lastMovedId, setLastMovedId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!touched) {
      return;
    }
    const handle = window.setTimeout(() => {
      const payload = {
        title: form.title,
        slug: form.slug || undefined,
        blurb: form.blurb || undefined,
        url: form.url || undefined,
        tags: parseTags(form.tags),
        order: prevHighestOrder(projects) + 1,
      };
      const parsed = AdminProjectSchema.safeParse(payload);
      setInlineErrors(parsed.success ? [] : parsed.error.issues.map((issue) => issue.message));
    }, 240);
    return () => window.clearTimeout(handle);
  }, [form, projects, touched]);

  const sortedProjects = useMemo(() => [...projects].sort((a, b) => a.order - b.order), [projects]);
  const listColumns: AdminListColumn<ProjectRecord>[] = useMemo(
    () => [
      {
        key: 'title',
        label: 'Title',
        className: 'admin-list__cell--truncate',
        render: (project) => project.title,
      },
      {
        key: 'slug',
        label: 'Slug',
        width: '180px',
        className: 'admin-list__cell--truncate',
        render: (project) => project.slug ?? '-',
      },
      {
        key: 'tags',
        label: 'Tags',
        className: 'admin-list__cell--truncate',
        render: (project) => project.tags.join(', ') || '-',
      },
      {
        key: 'order',
        label: 'Order',
        width: '88px',
        align: 'center',
        className: 'admin-list__order',
        render: (project) => project.order,
      },
    ],
    [],
  );

  const resetForm = () => {
    setForm({
      title: '',
      slug: '',
      blurb: '',
      url: '',
      tags: '',
      fileName: '',
    });
    setEditingId(null);
    setCaseStudyFile(null);
    setInlineErrors([]);
    setError(null);
    setTouched(false);
  };

  const submitProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    const currentOrder = editingId
      ? (projects.find((project) => project.id === editingId)?.order ?? prevHighestOrder(projects))
      : prevHighestOrder(projects) + 1;
    const payload = {
      title: form.title,
      slug: form.slug || undefined,
      blurb: form.blurb || undefined,
      url: form.url || undefined,
      tags: parseTags(form.tags),
      order: currentOrder,
    };

    const parsed = AdminProjectSchema.safeParse(payload);
    if (!parsed.success) {
      setInlineErrors(parsed.error.issues.map((issue) => issue.message));
      setError('Fix the validation errors before saving.');
      return;
    }
    setStatus('saving');
    setError(null);
    setInlineErrors([]);
    try {
      if (editingId) {
        const updated = await updateProject(editingId, payload, caseStudyFile);
        setProjects((prev) =>
          prev.map((project) => (project.id === editingId ? updated : project)),
        );
        resetForm();
      } else {
        const json = await adminFetchJson<{ project: ProjectRecord }>('/api/admin/projects', {
          method: 'POST',
          body: payload,
        });
        if (caseStudyFile) {
          await uploadCaseStudy(json.project.id, caseStudyFile);
        }
        const created: ProjectRecord = {
          ...json.project,
          order: payload.order ?? json.project.order,
        };
        setProjects((prev) => [...prev, created]);
        resetForm();
      }
    } catch (err) {
      const messages = resolveProjectError(err, 'Failed to save project.');
      setError('Failed to save project.');
      setInlineErrors(messages);
    } finally {
      setStatus('idle');
    }
  };

  const updateProject = async (id: string, patch: Partial<ProjectRecord>, file?: File | null) => {
    try {
      const json = await adminFetchJson<{ project: ProjectRecord }>(`/api/admin/projects/${id}`, {
        method: 'PUT',
        body: patch,
      });
      if (file) {
        await uploadCaseStudy(id, file);
      }
      return json.project;
    } catch (err) {
      const messages = resolveProjectError(err, 'Failed to update project.');
      setError('Failed to update project.');
      setInlineErrors(messages);
      throw err;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      await adminFetchJson(`/api/admin/projects/${id}`, { method: 'DELETE' });
      setProjects((prev) => prev.filter((project) => project.id !== id));
      if (editingId === id) {
        resetForm();
      }
    } catch (err) {
      const messages = resolveProjectError(err, 'Failed to delete project.');
      setError('Failed to delete project.');
      setInlineErrors(messages);
    }
  };

  const uploadCaseStudy = async (projectId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', PROJECT_MDX_BUCKET);
    formData.append('projectId', projectId);
    await adminFetchJson('/api/admin/projects/upload', {
      method: 'POST',
      body: formData,
    });
  };

  const removeCaseStudy = async (projectId: string) => {
    setStatus('removing');
    setError(null);
    setInlineErrors([]);
    setSuccessMessage(null);
    try {
      await adminFetchJson('/api/admin/projects/upload', {
        method: 'DELETE',
        body: { projectId, bucket: PROJECT_MDX_BUCKET },
      });
      setCaseStudyFile(null);
      setForm((prev) => ({ ...prev, fileName: '' }));
      // Show brief success message
      setSuccessMessage('Case study removed successfully.');
      window.setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err) {
      const messages = resolveProjectError(err, 'Failed to remove case study.');
      setError('Failed to remove case study.');
      setInlineErrors(messages);
    } finally {
      setStatus('idle');
    }
  };

  const moveProject = async (id: string, direction: 'up' | 'down') => {
    const currentIndex = sortedProjects.findIndex((project) => project.id === id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex === -1 || targetIndex < 0 || targetIndex >= sortedProjects.length) {
      return;
    }

    const reordered = [...sortedProjects];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    const reindexed = reordered.map((project, idx) => ({ ...project, order: idx + 1 }));

    setProjects(reindexed);
    setLastMovedId(id);

    try {
      const changed = reindexed.filter(
        (project, idx) =>
          project.order !== sortedProjects[idx]?.order || project.id !== sortedProjects[idx]?.id,
      );
      await Promise.all(
        changed.map((project) => updateProject(project.id, { order: project.order })),
      );
    } catch (err) {
      const messages = resolveProjectError(err, 'Failed to reorder projects.');
      setError('Failed to reorder projects.');
      setInlineErrors(messages);
      setProjects(sortedProjects);
    } finally {
      window.setTimeout(() => setLastMovedId(null), 800);
    }
  };

  const listRows: AdminListRow<ProjectRecord>[] = sortedProjects.map((project, index) => ({
    id: project.id,
    data: project,
    highlight: lastMovedId === project.id,
    actionsLabel: `Actions for ${project.title}`,
    actions: [
      {
        label: '↑',
        ariaLabel: `Move ${project.title} up`,
        variant: 'ghost',
        disabled: index === 0,
        onClick: () => void moveProject(project.id, 'up'),
      },
      {
        label: '↓',
        ariaLabel: `Move ${project.title} down`,
        variant: 'ghost',
        disabled: index === sortedProjects.length - 1,
        onClick: () => void moveProject(project.id, 'down'),
      },
      {
        label: 'Edit',
        onClick: () => {
          setEditingId(project.id);
          setForm({
            title: project.title,
            slug: project.slug ?? '',
            blurb: project.blurb ?? '',
            url: project.url ?? '',
            tags: project.tags.join(', '),
            fileName: '',
          });
          setError(null);
          setInlineErrors([]);
          setTouched(false);
        },
      },
      {
        label: 'Delete',
        ariaLabel: `Delete ${project.title}`,
        variant: 'danger',
        onClick: () => void deleteProject(project.id),
      },
    ],
  }));

  const projectCountLabel = `${projects.length} project${projects.length === 1 ? '' : 's'}`;

  return (
    <section
      className={clsx('admin-card admin-card--wide admin-card--stack', cardStyles.card)}
      role="region"
      aria-label="Projects manager"
    >
      <header className={clsx('admin-card__header', cardStyles.header)}>
        <div>
          <h3 className={clsx('admin-card__title', cardStyles.title)}>Projects</h3>
          <p className={clsx('admin-card__description', cardStyles.description)}>
            Add your projects and case studies for Option 4.
          </p>
        </div>
        <span className={clsx('admin-card__pill', cardStyles.pill)}>{projectCountLabel}</span>
      </header>
      <AdminList
        columns={listColumns}
        rows={listRows}
        actionsWidth="260px"
        emptyLabel="No projects yet."
      />
      <form
        className={clsx('admin-form', formStyles.form, formStyles.twoCol)}
        noValidate
        onSubmit={submitProject}
      >
        <div className={clsx('admin-form__split', formStyles.split)}>
          <strong>{editingId ? 'Editing Project' : 'New Project'}</strong>
          {editingId ? (
            <button type="button" onClick={() => resetForm()} disabled={status === 'saving'}>
              Cancel edit
            </button>
          ) : null}
        </div>
        <label>
          Title
          <input
            value={form.title}
            onChange={(event) => {
              setTouched(true);
              setForm((prev) => ({ ...prev, title: event.target.value }));
            }}
            required
          />
        </label>
        <label>
          Subtitle
          <input
            value={form.blurb}
            onChange={(event) => {
              setTouched(true);
              setForm((prev) => ({ ...prev, blurb: event.target.value }));
            }}
            placeholder="Optional"
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
            placeholder="https://example.com"
          />
        </label>
        <label>
          Slug
          <input
            value={form.slug}
            onChange={(event) => {
              setTouched(true);
              setForm((prev) => ({ ...prev, slug: event.target.value }));
            }}
            placeholder="e.g. eva-terminal-refresh"
          />
        </label>
        <label data-wide="true">
          Tags (comma separated)
          <input
            value={form.tags}
            onChange={(event) => {
              setTouched(true);
              setForm((prev) => ({ ...prev, tags: event.target.value }));
            }}
            data-tall="true"
          />
        </label>
        <label data-wide="true">
          Summary
          <textarea
            data-tall="true"
            rows={4}
            value={form.blurb}
            onChange={(event) => {
              setTouched(true);
              setForm((prev) => ({ ...prev, blurb: event.target.value }));
            }}
          />
        </label>
        <div className={clsx('admin-form__hint', 'admin-form__hint--inline', formStyles.hint)}>
          Upload a long-from .md/.mdx case study and add a Slug to host on the dedicated /projects/
          reader.
        </div>
        <div className={clsx('admin-upload', formStyles.upload)}>
          <label className="admin-upload__button">
            Upload case-study (.md/.mdx)
            <input
              type="file"
              accept=".md,.mdx,text/markdown"
              onChange={(event) => {
                const file = event.target.files?.[0];
                setCaseStudyFile(file ?? null);
                setForm((prev) => ({ ...prev, fileName: file?.name ?? '' }));
              }}
            />
          </label>
          <span className="admin-upload__filename">{form.fileName || 'No file selected'}</span>
          {editingId ? (
            <button
              type="button"
              className="admin-upload__remove"
              onClick={() => void removeCaseStudy(editingId)}
              disabled={status === 'removing'}
            >
              {status === 'removing' ? 'Removing...' : 'Remove case-study'}
            </button>
          ) : null}
        </div>
        {successMessage ? (
          <div className="admin-inline-notice" role="status" aria-live="polite">
            <p className={clsx('admin-form__success', formStyles.success)}>{successMessage}</p>
          </div>
        ) : null}
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
          {status === 'saving' ? 'Saving...' : editingId ? 'Save Changes' : 'Add Project'}
        </button>
      </form>
    </section>
  );
}

function prevHighestOrder(records: ProjectRecord[]) {
  if (!records.length) {
    return 0;
  }
  return Math.max(...records.map((record) => record.order));
}

function resolveProjectError(error: unknown, fallback: string): string[] {
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
