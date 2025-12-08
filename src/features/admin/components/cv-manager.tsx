'use client';

import clsx from 'clsx';
import React, { useRef, useState } from 'react';

import { AdminApiError, adminFetchJson } from '@/lib/admin/fetch-json';
import type { StorageBucketStatus } from '@/lib/types/storage';

import cardStyles from './admin-card.module.css';
import formStyles from './admin-form.module.css';
import cvCardStyles from './cv-cards.module.css';

type Props = {
  lastUpdated: string | null;
  downloadUrl: string | null;
  fileName: string | null;
  bucketStatus?: StorageBucketStatus;
};

export function CvManager({ lastUpdated, downloadUrl, fileName, bucketStatus }: Props) {
  const [status, setStatus] = useState<'idle' | 'uploading'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [latestUrl, setLatestUrl] = useState(downloadUrl);
  const [latestUpdated, setLatestUpdated] = useState(lastUpdated);
  const [latestName, setLatestName] = useState(fileName);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bucketReady = !bucketStatus || bucketStatus.ok;
  const cvStatusLabel = bucketReady
    ? latestName
      ? 'Ready'
      : 'Awaiting upload'
    : (bucketStatus?.message ?? 'Bucket unavailable');

  const upload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!bucketReady) {
      setError(bucketStatus?.message ?? 'Storage bucket is unavailable.');
      return;
    }
    const fileInput = fileInputRef.current;
    if (!fileInput?.files?.length) {
      setError('Select a PDF to upload.');
      return;
    }
    const file = fileInput.files[0];
    setStatus('uploading');
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await adminFetchJson<{ ok: boolean; meta?: Record<string, unknown> }>(
        '/api/admin/cv',
        { method: 'POST', body: formData },
      );

      const meta = response.meta ?? {};
      const nextUrl = typeof meta.download_url === 'string' ? meta.download_url : null;
      const nextUpdated = typeof meta.last_updated === 'string' ? meta.last_updated : null;
      const nextName = typeof meta.file_name === 'string' ? meta.file_name : null;

      setLatestUrl(nextUrl);
      setLatestUpdated(nextUpdated);
      setLatestName(nextName);
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Upload failed.');
    } finally {
      setStatus('idle');
    }
  };

  return (
    <section className={clsx('admin-card admin-card--wide admin-card--stack', cardStyles.card)}>
      <header className={clsx('admin-card__header', cardStyles.header)}>
        <div>
          <h3 className={clsx('admin-card__title', cardStyles.title)}>CV Upload</h3>
          <p className={clsx('admin-card__description', cardStyles.description)}>
            Upload your CV for Option 2.
          </p>
        </div>
        <span
          className={clsx('admin-card__pill', cardStyles.pill)}
          data-state={bucketReady && latestName ? 'success' : 'warning'}
        >
          {cvStatusLabel}
        </span>
      </header>
      <div className={cvCardStyles.metrics}>
        <button
          type="button"
          className={clsx(cvCardStyles.card, cvCardStyles.interactive)}
          disabled={!latestUrl}
          onClick={() => latestUrl && window.open(latestUrl, '_blank')}
        >
          <p className={cvCardStyles.label}>Current CV</p>
          <p className={cvCardStyles.value}>{latestName ? 'Click to view' : 'Not uploaded'}</p>
        </button>
        <div className={cvCardStyles.card}>
          <p className={cvCardStyles.label}>Last Updated</p>
          <p className={cvCardStyles.value}>
            {latestUpdated ? formatDate(latestUpdated) : 'Never'}
          </p>
        </div>
        <button
          type="button"
          className={clsx(cvCardStyles.card, cvCardStyles.interactive)}
          disabled={!bucketReady}
          onClick={() => fileInputRef.current?.click()}
        >
          <p className={cvCardStyles.label}>New CV</p>
          <p className={cvCardStyles.value}>{latestName ? 'Click to select' : 'Click to select'}</p>
        </button>
      </div>

      <form className={clsx('admin-form cv-upload', formStyles.form)} onSubmit={upload}>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          required
          disabled={!bucketReady}
          style={{ display: 'none' }}
        />
        {error ? <p className={clsx('admin-form__error', formStyles.error)}>{error}</p> : null}
        {!bucketReady && bucketStatus?.message ? (
          <p className={clsx('admin-form__error', formStyles.error)}>{bucketStatus.message}</p>
        ) : null}
        <button
          type="submit"
          className="admin-button-accent cv-upload__submit"
          disabled={!bucketReady || status === 'uploading'}
        >
          {status === 'uploading' ? 'Uploading.' : 'Upload CV'}
        </button>
      </form>
    </section>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
  }).format(date);
}
