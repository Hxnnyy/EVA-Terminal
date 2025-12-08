'use client';

import clsx from 'clsx';
import React, { type ReactNode, useMemo } from 'react';

import { useCspNonce } from '@/lib/csp/nonce-context';

export type AdminListColumn<Row> = {
  key: string;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
  render?: (row: Row) => ReactNode;
};

type AdminListAction<Row> = {
  label: string;
  ariaLabel?: string;
  variant?: 'default' | 'danger' | 'ghost';
  disabled?: boolean;
  onClick: (row: Row) => void | Promise<void>;
};

export type AdminListRow<Row> = {
  id: string;
  data: Row;
  actions?: AdminListAction<Row>[];
  highlight?: boolean;
  actionsLabel?: string;
};

type AdminListProps<Row> = {
  columns: AdminListColumn<Row>[];
  rows: AdminListRow<Row>[];
  actionsLabel?: string;
  actionsWidth?: string;
  emptyLabel?: string;
  className?: string;
  ariaLabel?: string;
  caption?: string;
};

export function AdminList<Row>({
  columns,
  rows,
  actionsLabel = 'Actions',
  actionsWidth = '180px',
  emptyLabel = 'No entries yet.',
  className,
  ariaLabel = 'Admin list',
  caption,
}: AdminListProps<Row>) {
  const nonce = useCspNonce();
  const rawId = React.useId();
  const listId = useMemo(() => rawId.replace(/[:]/g, ''), [rawId]);

  const columnTemplate = useMemo(
    () => [...columns.map((column) => column.width ?? '1fr'), actionsWidth].join(' '),
    [actionsWidth, columns],
  );

  const scopedStyles = useMemo(
    () =>
      [
        `#${listId} .admin-list__header{--admin-list-columns:${columnTemplate};}`,
        `#${listId} .admin-list__row{--admin-list-columns:${columnTemplate};}`,
      ].join(''),
    [columnTemplate, listId],
  );

  return (
    <div id={listId} className={clsx('admin-list', className)} role="table" aria-label={ariaLabel}>
      {/* SECURITY: Safe usage — CSS generated from computed column widths.
          Content is numeric/derived from props, not user-provided.
          Nonce protects from injection. */}
      <style nonce={nonce ?? undefined} dangerouslySetInnerHTML={{ __html: scopedStyles }} />
      {caption ? (
        <div className="visually-hidden" role="caption">
          {caption}
        </div>
      ) : null}
      <div className="admin-list__header" role="row">
        {columns.map((column) => (
          <span key={column.key} data-align={column.align ?? 'left'} role="columnheader">
            {column.label}
          </span>
        ))}
        <span className="admin-list__header-actions" data-align="right" role="columnheader">
          {actionsLabel}
        </span>
      </div>

      {!rows.length ? (
        <div className="admin-list__empty">{emptyLabel}</div>
      ) : (
        rows.map((row) => (
          <div
            key={row.id}
            className={clsx('admin-list__row', row.highlight && 'admin-list__row--active')}
            role="row"
          >
            {columns.map((column) => (
              <div
                key={column.key}
                className={clsx('admin-list__cell', column.className)}
                data-align={column.align ?? 'left'}
                data-label={column.label}
                role="cell"
              >
                {column.render
                  ? column.render(row.data)
                  : (row.data as Record<string, ReactNode>)[column.key]}
              </div>
            ))}
            <div
              className="admin-list__actions"
              aria-label={
                row.actionsLabel ?? (row.id ? `${actionsLabel} for ${row.id}` : actionsLabel)
              }
              role="cell"
            >
              {row.actions?.map((action, index) => (
                <button
                  key={`${action.label}-${index}`}
                  type="button"
                  onClick={() => action.onClick(row.data)}
                  aria-label={action.ariaLabel ?? action.label}
                  data-variant={action.variant ?? 'default'}
                  disabled={action.disabled}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
