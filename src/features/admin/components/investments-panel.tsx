'use client';

import clsx from 'clsx';
import React, { useMemo, useState } from 'react';

import { AdminApiError, adminFetchJson } from '@/lib/admin/fetch-json';
import type { InvestmentRecord } from '@/lib/types/investments';

import cardStyles from './admin-card.module.css';
import formStyles from './admin-form.module.css';
import { AdminList, type AdminListColumn, type AdminListRow } from './admin-list';

const PROVIDERS = [
  {
    id: 'stooq',
    label: 'Stooq (daily CSV)',
    hint: 'Use lowercase ticker plus .us for U.S. equities (e.g., aapl.us).',
  },
  {
    id: 'alphavantage',
    label: 'Alpha Vantage (fallback)',
    hint: 'Supply the exact symbol you configured on Alpha Vantage.',
  },
] as const;

type Provider = (typeof PROVIDERS)[number]['id'];

type Props = {
  initialInvestments: InvestmentRecord[];
  lastRefreshed: string | null;
};

type RefreshResponse = {
  status: 'refreshed' | 'skipped';
  lastRefreshed: string | null;
  results: Array<{ ticker: string | null; updated: boolean; source: string }>;
  investments: InvestmentRecord[];
};

type CreateResponse = {
  investment: InvestmentRecord;
};

export function InvestmentsPanel({ initialInvestments, lastRefreshed }: Props) {
  const [investments, setInvestments] = useState(initialInvestments);
  const [form, setForm] = useState({
    ticker: '',
    label: '',
    provider: 'stooq' as Provider,
    providerSymbol: '',
  });
  const [createStatus, setCreateStatus] = useState<'idle' | 'saving'>('idle');
  const [refreshStatus, setRefreshStatus] = useState<'idle' | 'refreshing'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<string | null>(lastRefreshed);
  const [lastMovedId, setLastMovedId] = useState<string | null>(null);
  const lastRunLabel = lastRun
    ? `Synced ${new Date(lastRun).toLocaleString()}`
    : 'Awaiting first sync';

  const sortedInvestments = useMemo(
    () =>
      [...investments].sort((a, b) => {
        if (a.order !== b.order) {
          return a.order - b.order;
        }
        return a.ticker.localeCompare(b.ticker);
      }),
    [investments],
  );

  const inferredSymbol = defaultProviderSymbol(form.ticker, form.provider);

  const listColumns: AdminListColumn<InvestmentRecord>[] = useMemo(
    () => [
      { key: 'ticker', label: 'Ticker', width: '72px', render: (inv) => inv.ticker },
      {
        key: 'label',
        label: 'Label',
        className: 'admin-list__cell--truncate',
        render: (inv) => inv.label ?? '-',
      },
      { key: 'provider', label: 'Provider', width: '96px', render: (inv) => inv.provider },
      {
        key: 'providerSymbol',
        label: 'Symbol',
        width: '112px',
        className: 'admin-list__cell--truncate',
        render: (inv) => inv.providerSymbol ?? '-',
      },
      {
        key: 'perf6mPercent',
        label: '6M%',
        width: '72px',
        align: 'right',
        render: (inv) => formatPerf(inv.perf6mPercent),
      },
      {
        key: 'perfLastFetched',
        label: 'Fetched',
        width: '104px',
        align: 'right',
        render: (inv) => formatDate(inv.perfLastFetched),
      },
      {
        key: 'order',
        label: 'Order',
        width: '64px',
        align: 'center',
        className: 'admin-list__order',
        render: (inv) => inv.order ?? '-',
      },
    ],
    [],
  );

  const submitInvestment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateStatus('saving');
    setError(null);
    try {
      const payload = {
        ticker: form.ticker.trim().toUpperCase(),
        label: form.label.trim() || null,
        provider: form.provider,
        provider_symbol: (form.providerSymbol.trim() || inferredSymbol || null) ?? null,
        order: nextOrder(investments),
      };

      if (!payload.ticker) {
        throw new Error('Ticker is required.');
      }

      const json = await adminFetchJson<CreateResponse>('/api/admin/investments', {
        method: 'POST',
        body: payload,
      });
      let nextRecords: InvestmentRecord[] = [];
      setInvestments((prev) => {
        const updated = sortByOrder([...prev, json.investment]);
        nextRecords = updated;
        return updated;
      });
      if (!nextRecords.length) {
        nextRecords = sortByOrder([...investments, json.investment]);
      }
      setForm({
        ticker: '',
        label: '',
        provider: form.provider,
        providerSymbol: '',
      });
    } catch (err) {
      setError(resolveAdminError(err, 'Failed to add investment.'));
    } finally {
      setCreateStatus('idle');
    }
  };

  const removeInvestment = async (id: string) => {
    setError(null);
    try {
      await adminFetchJson(`/api/admin/investments/${id}`, { method: 'DELETE' });
      setInvestments((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(resolveAdminError(err, 'Failed to delete investment.'));
    }
  };

  const moveInvestment = async (id: string, direction: 'up' | 'down') => {
    const currentIndex = sortedInvestments.findIndex((inv) => inv.id === id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex === -1 || targetIndex < 0 || targetIndex >= sortedInvestments.length) {
      return;
    }

    const reordered = [...sortedInvestments];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    const reindexed = reordered.map((inv, idx) => ({ ...inv, order: idx + 1 }));
    const changed = reindexed.filter(
      (inv, idx) =>
        inv.order !== sortedInvestments[idx]?.order || inv.id !== sortedInvestments[idx]?.id,
    );

    setInvestments(reindexed);
    setLastMovedId(id);

    try {
      await Promise.all(
        changed.map((inv) =>
          adminFetchJson(`/api/admin/investments/${inv.id}`, {
            method: 'PUT',
            body: { order: inv.order },
          }),
        ),
      );
    } catch (err) {
      setError(resolveAdminError(err, 'Failed to reorder investments.'));
      setInvestments(sortedInvestments);
    } finally {
      window.setTimeout(() => setLastMovedId(null), 800);
    }
  };

  const refresh = async () => {
    setRefreshStatus('refreshing');
    setError(null);
    try {
      const json = await adminFetchJson<RefreshResponse>('/api/admin/investments/refresh', {
        method: 'POST',
      });
      if (Array.isArray(json.investments)) {
        setInvestments(sortByOrder(json.investments));
      }
      setLastRun(json.lastRefreshed ?? new Date().toISOString());
    } catch (err) {
      setError(resolveAdminError(err, 'Refresh failed.'));
    } finally {
      setRefreshStatus('idle');
    }
  };

  const listRows: AdminListRow<InvestmentRecord>[] = sortedInvestments.map((investment, index) => ({
    id: investment.id,
    data: investment,
    highlight: lastMovedId === investment.id,
    actionsLabel: `Actions for ${investment.ticker}`,
    actions: [
      {
        label: '↑',
        ariaLabel: `Move ${investment.ticker} up`,
        variant: 'ghost',
        disabled: index === 0,
        onClick: () => void moveInvestment(investment.id, 'up'),
      },
      {
        label: '↓',
        ariaLabel: `Move ${investment.ticker} down`,
        variant: 'ghost',
        disabled: index === sortedInvestments.length - 1,
        onClick: () => void moveInvestment(investment.id, 'down'),
      },
      {
        label: 'Delete',
        ariaLabel: `Delete ${investment.ticker}`,
        variant: 'danger',
        onClick: () => void removeInvestment(investment.id),
      },
    ],
  }));

  return (
    <section className={clsx('admin-card admin-card--wide admin-card--stack', cardStyles.card)}>
      <header className={clsx('admin-card__header', cardStyles.header)}>
        <div>
          <h3 className={clsx('admin-card__title', cardStyles.title)}>Investments</h3>
          <p className={clsx('admin-card__description', cardStyles.description)}>
            Add your investments for Option 6.
          </p>
        </div>
        <span className={clsx('admin-card__pill', cardStyles.pill)}>{lastRunLabel}</span>
      </header>

      <AdminList
        columns={listColumns}
        rows={listRows}
        actionsWidth="150px"
        emptyLabel="No investments yet. Add the first ticker below."
      />

      <form
        className={clsx('admin-form admin-form--investments', formStyles.form, formStyles.twoCol)}
        onSubmit={submitInvestment}
      >
        <label>
          Ticker
          <input
            value={form.ticker}
            onChange={(event) => setForm((prev) => ({ ...prev, ticker: event.target.value }))}
            placeholder="AAPL"
            required
          />
        </label>
        <label>
          Label (optional)
          <input
            value={form.label}
            onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
            placeholder="Apple Inc."
          />
        </label>
        <label>
          Provider
          <select
            value={form.provider}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                provider: event.target.value as Provider,
              }))
            }
          >
            {PROVIDERS.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <div className="admin-inline-info">
            <span>Provider symbol</span>
            <span
              className="admin-info-icon"
              title={PROVIDERS.find((item) => item.id === form.provider)?.hint}
            >
              i
            </span>
          </div>
          <input
            value={form.providerSymbol}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, providerSymbol: event.target.value }))
            }
            placeholder={inferredSymbol || 'ticker.ex'}
          />
        </label>
        {error ? <p className={clsx('admin-form__error', formStyles.error)}>{error}</p> : null}
        <button type="submit" className="admin-button-accent" disabled={createStatus === 'saving'}>
          {createStatus === 'saving' ? 'Saving...' : 'Add Investment'}
        </button>
      </form>

      <footer className="admin-refresh">
        <div>
          <h3 className={clsx('admin-card__title', cardStyles.title)}>Manual refresh</h3>
          <p className={clsx('admin-card__description', cardStyles.description)}>
            Investments are cached for readers; use this action (or a scheduled POST to
            /api/admin/investments/refresh) to pull the latest performance before caches revalidate.
          </p>
        </div>
        <div className="admin-refresh__meta">
          <p className={clsx('admin-card__description', cardStyles.description)} aria-live="polite">
            Last refreshed: {lastRun ? new Date(lastRun).toLocaleString() : 'Never'}
          </p>
          <button
            type="button"
            className="admin-button-accent"
            onClick={refresh}
            disabled={refreshStatus === 'refreshing'}
          >
            {refreshStatus === 'refreshing' ? 'Refreshing...' : 'Run refresh'}
          </button>
        </div>
      </footer>
    </section>
  );
}

function defaultProviderSymbol(ticker: string, provider: Provider) {
  const trimmed = ticker.trim();
  if (!trimmed) {
    return '';
  }
  if (provider === 'stooq') {
    return `${trimmed.toLowerCase()}.us`;
  }
  return trimmed.toUpperCase();
}

function sortByOrder(records: InvestmentRecord[]) {
  return [...records].sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    return a.ticker.localeCompare(b.ticker);
  });
}

function nextOrder(records: InvestmentRecord[]) {
  if (!records.length) {
    return 1;
  }
  return Math.max(...records.map((record) => record.order ?? 0)) + 1;
}

function formatPerf(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return '-';
  }
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function formatDate(value: string | null) {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
}

function resolveAdminError(error: unknown, fallback: string) {
  if (error instanceof AdminApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}
