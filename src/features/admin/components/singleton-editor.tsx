'use client';

import clsx from 'clsx';
import React, { useState } from 'react';

import { AdminApiError, adminFetchJson } from '@/lib/admin/fetch-json';

type BaseProps = {
  title: string;
  description: string;
};

type TextareaProps = BaseProps & {
  singletonKey: string;
  initialBody: string;
  fullWidth?: boolean;
};

type ContactEditorProps = BaseProps & {
  initialEmail: string;
  initialPhone?: string;
  initialDiscord?: string;
  fullWidth?: boolean;
};

type StatusState = 'idle' | 'saving' | 'success' | 'error';

function StatusPill({ state }: { state: StatusState }) {
  if (state === 'idle') {
    return null;
  }
  const label = state === 'saving' ? 'Saving...' : state === 'success' ? 'Saved' : 'Error';
  return (
    <span className="admin-card__pill" data-state={state}>
      {label}
    </span>
  );
}

export function SingletonTextareaEditor({
  title,
  description,
  singletonKey,
  initialBody,
  fullWidth = false,
}: TextareaProps) {
  const [value, setValue] = useState(initialBody);
  const [status, setStatus] = useState<StatusState>('idle');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('saving');
    setError(null);
    try {
      await adminFetchJson('/api/admin/singletons', {
        method: 'PUT',
        body: { key: singletonKey, body_mdx: value },
      });
      setStatus('success');
      setTimeout(() => setStatus('idle'), 1500);
    } catch (err) {
      setStatus('error');
      setError(err instanceof AdminApiError ? err.message : 'Update failed.');
    }
  };

  const cardClassName = clsx('admin-card admin-card--stack', fullWidth && 'admin-card--wide');

  return (
    <section className={cardClassName}>
      <header className="admin-card__header">
        <div>
          <h3 className="admin-card__title">{title}</h3>
          <p className="admin-card__description">{description}</p>
        </div>
        <StatusPill state={status} />
      </header>
      <form className="admin-form" onSubmit={onSubmit}>
        <textarea value={value} onChange={(event) => setValue(event.target.value)} rows={10} />
        {error ? <p className="admin-form__error">{error}</p> : null}
        <button type="submit" className="admin-button-accent" disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving...' : status === 'success' ? 'Saved' : 'Save'}
        </button>
      </form>
    </section>
  );
}

export function ContactEditor({
  title,
  description,
  initialEmail,
  initialPhone,
  initialDiscord,
  fullWidth = false,
}: ContactEditorProps) {
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone ?? '');
  const [discord, setDiscord] = useState(initialDiscord ?? '');
  const [status, setStatus] = useState<StatusState>('idle');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('saving');
    setError(null);
    try {
      await adminFetchJson('/api/admin/singletons', {
        method: 'PUT',
        body: {
          key: 'contact',
          meta: {
            email,
            phone: phone || null,
            discord: discord || null,
          },
        },
      });
      setStatus('success');
      setTimeout(() => setStatus('idle'), 1500);
    } catch (err) {
      setStatus('error');
      setError(err instanceof AdminApiError ? err.message : 'Update failed.');
    }
  };

  const cardClassName = clsx('admin-card admin-card--stack', fullWidth && 'admin-card--wide');

  return (
    <section className={cardClassName}>
      <header className="admin-card__header">
        <div>
          <h3 className="admin-card__title">{title}</h3>
          <p className="admin-card__description">{description}</p>
        </div>
        <StatusPill state={status} />
      </header>
      <form className="admin-form admin-form--contact" onSubmit={onSubmit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Phone
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Optional"
          />
        </label>
        <label>
          Discord
          <input
            value={discord}
            onChange={(event) => setDiscord(event.target.value)}
            placeholder="Optional"
          />
        </label>
        {error ? <p className="admin-form__error">{error}</p> : null}
        <button type="submit" className="admin-button-accent" disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving...' : status === 'success' ? 'Saved' : 'Save'}
        </button>
      </form>
    </section>
  );
}
