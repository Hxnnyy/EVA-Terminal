'use client';

import clsx from 'clsx';
import Image from 'next/image';
import React, { useMemo, useState } from 'react';

import type { AdminReelItem } from '@/features/admin/types';
import { AdminApiError, adminFetchJson } from '@/lib/admin/fetch-json';

import cardStyles from './admin-card.module.css';
import formStyles from './admin-form.module.css';
import { AdminList, type AdminListColumn, type AdminListRow } from './admin-list';

type Props = {
  initialReel: AdminReelItem[];
  bucketStatus?: { ok: boolean; message?: string } | null;
};

export function ReelManager({ initialReel, bucketStatus }: Props) {
  const [items, setItems] = useState<AdminReelItem[]>(() => sortRecords(initialReel));
  const [formCaption, setFormCaption] = useState('');
  const [formFile, setFormFile] = useState<File | null>(null);
  const [editTarget, setEditTarget] = useState<AdminReelItem | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading'>('idle');
  const [error, setError] = useState<string | null>(null);

  const bucketReady = bucketStatus?.ok ?? true;

  const sortedItems = useMemo(() => sortRecords(items), [items]);
  const listColumns: AdminListColumn<AdminReelItem>[] = useMemo(
    () => [
      {
        key: 'order',
        label: '#',
        width: '64px',
        align: 'left',
        className: 'admin-list__order',
        render: (item) => item.order,
      },
      {
        key: 'preview',
        label: 'Preview',
        width: '120px',
        align: 'center',
        render: (item) => (
          <div className="admin-list__preview">
            <Image src={item.url} alt={item.caption ?? ''} width={68} height={68} />
          </div>
        ),
      },
      {
        key: 'caption',
        label: 'Caption',
        className: 'admin-list__cell--truncate',
        render: (item) => item.caption ?? '-',
      },
    ],
    [],
  );

  const handleMove = (id: string, direction: 'up' | 'down') => {
    setError(null);
    const currentIndex = sortedItems.findIndex((item) => item.id === id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex === -1 || targetIndex < 0 || targetIndex >= sortedItems.length) return;

    const reordered = [...sortedItems];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    const reindexed = reordered.map((item, idx) => ({ ...item, order: idx }));
    setItems(reindexed);

    void persistOrder(reindexed);
  };

  const persistOrder = async (records: AdminReelItem[]) => {
    try {
      await Promise.all(
        records.map((item) =>
          adminFetchJson(`/api/admin/reel/${item.id}`, {
            method: 'PUT',
            body: { order: item.order },
          }),
        ),
      );
    } catch (err) {
      setError(resolveError(err, 'Failed to reorder images.'));
      setItems(sortRecords(items));
    }
  };

  const beginEdit = (item: AdminReelItem) => {
    setEditTarget(item);
    setFormCaption(item.caption ?? '');
    setFormFile(null);
  };

  const resetForm = () => {
    setEditTarget(null);
    setFormCaption('');
    setFormFile(null);
    setError(null);
  };

  const upload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editTarget && !formFile) {
      setError('Image file is required.');
      return;
    }
    setUploadStatus('uploading');
    setError(null);

    try {
      if (editTarget) {
        const patch: Partial<Pick<AdminReelItem, 'caption' | 'order'>> = {
          caption: formCaption.trim() || null,
        };
        const { image } = await adminFetchJson<{ image: AdminReelItem }>(
          `/api/admin/reel/${editTarget.id}`,
          {
            method: 'PUT',
            body: patch,
          },
        );
        setItems((prev) => sortRecords(prev.map((item) => (item.id === image.id ? image : item))));
        resetForm();
      } else {
        if (!formFile) {
          setError('Select an image file to upload.');
          setUploadStatus('idle');
          return;
        }
        const formData = new FormData();
        formData.append('file', formFile);
        formData.append('caption', formCaption.trim());
        formData.append('order', nextOrder(items).toString());
        const { image } = await adminFetchJson<{ image: AdminReelItem }>('/api/admin/reel', {
          method: 'POST',
          body: formData,
        });
        setItems((prev) => sortRecords([...prev, image]));
        resetForm();
      }
    } catch (err) {
      setError(
        resolveError(err, editTarget ? 'Failed to save changes.' : 'Failed to upload image.'),
      );
    } finally {
      setUploadStatus('idle');
    }
  };

  const deleteItem = async (id: string) => {
    setError(null);
    try {
      await adminFetchJson(`/api/admin/reel/${id}`, { method: 'DELETE' });
      setItems((prev) => sortRecords(prev.filter((item) => item.id !== id)));
      if (editTarget?.id === id) {
        resetForm();
      }
    } catch (err) {
      setError(resolveError(err, 'Failed to delete image.'));
    }
  };

  const submitLabel =
    uploadStatus === 'uploading'
      ? editTarget
        ? 'Saving...'
        : 'Uploading...'
      : editTarget
        ? 'Save Changes'
        : 'Add Image';

  const listRows: AdminListRow<AdminReelItem>[] = sortedItems.map((item, index) => {
    const caption = item.caption ?? 'reel item';
    return {
      id: item.id,
      data: item,
      actionsLabel: `Actions for ${caption}`,
      actions: [
        {
          label: 'Up',
          ariaLabel: `Move ${caption} up`,
          variant: 'ghost',
          disabled: index === 0,
          onClick: () => handleMove(item.id, 'up'),
        },
        {
          label: 'Down',
          ariaLabel: `Move ${caption} down`,
          variant: 'ghost',
          disabled: index === sortedItems.length - 1,
          onClick: () => handleMove(item.id, 'down'),
        },
        {
          label: 'Edit',
          onClick: () => beginEdit(item),
        },
        {
          label: 'Delete',
          ariaLabel: `Delete ${caption}`,
          variant: 'danger',
          onClick: () => void deleteItem(item.id),
        },
      ],
    };
  });

  return (
    <section
      className={clsx('admin-card admin-card--wide admin-card--stack', cardStyles.card)}
      role="region"
      aria-label="Reel images manager"
    >
      <header className={clsx('admin-card__header', cardStyles.header)}>
        <div>
          <h3 className={clsx('admin-card__title', cardStyles.title)}>Reel Images</h3>
          <p className={clsx('admin-card__description', cardStyles.description)}>
            Add your images for Option 9.
          </p>
        </div>
      </header>

      <AdminList
        className="reel-list"
        columns={listColumns}
        rows={listRows}
        actionsWidth="240px"
        emptyLabel="No reel images yet."
      />

      <form
        className={clsx(
          'admin-form reel-form reel-form--stacked',
          formStyles.form,
          formStyles.twoCol,
        )}
        noValidate
        onSubmit={upload}
      >
        <label>
          Choose Image
          <input
            className={formStyles.reelFileInput}
            type="file"
            accept="image/*"
            disabled={!bucketReady || Boolean(editTarget)}
            onChange={(event) => setFormFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <label>
          Caption
          <input
            value={formCaption}
            onChange={(event) => setFormCaption(event.target.value)}
            placeholder="Optional"
            disabled={!bucketReady}
          />
        </label>
        {error ? (
          <p
            className={clsx('admin-form__error', formStyles.error)}
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        ) : null}
        <div className="reel-form__actions">
          {editTarget ? (
            <button
              type="button"
              className="admin-button-accent"
              onClick={resetForm}
              disabled={uploadStatus === 'uploading'}
            >
              Cancel
            </button>
          ) : null}
          <button
            type="submit"
            className="admin-button-accent"
            disabled={!bucketReady || uploadStatus === 'uploading'}
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </section>
  );
}

function sortRecords(records: AdminReelItem[]) {
  return [...records].sort((a, b) => a.order - b.order);
}

function nextOrder(records: AdminReelItem[]) {
  if (!records.length) return 0;
  return Math.max(...records.map((item) => item.order ?? 0)) + 1;
}

function resolveError(error: unknown, fallback: string) {
  if (error instanceof AdminApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}
