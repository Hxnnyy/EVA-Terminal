import { serverEnv } from '@/lib/env.server';
import { createLogger } from '@/lib/logger';

const API_KEY = serverEnv.ALPHAVANTAGE_API_KEY?.trim();
const ENDPOINT = serverEnv.ALPHAVANTAGE_ENDPOINT?.trim() || 'https://www.alphavantage.co/query';

const MS_IN_DAY = 24 * 60 * 60 * 1000;

type SeriesRow = {
  date: Date;
  close: number;
};

export async function fetchAlphaVantageSixMonthPerformance(symbol: string): Promise<number | null> {
  if (!API_KEY) {
    return null;
  }

  const trimmed = symbol.trim().toUpperCase();
  if (!trimmed) {
    return null;
  }

  const params = new URLSearchParams({
    function: 'TIME_SERIES_DAILY_ADJUSTED',
    symbol: trimmed,
    outputsize: 'full',
    apikey: API_KEY,
  });
  const response = await fetch(`${ENDPOINT}?${params.toString()}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Alpha Vantage request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const timeSeries = payload['Time Series (Daily)'] as
    | Record<string, Record<string, string>>
    | undefined;
  if (!timeSeries) {
    const throttled = (payload as { Note?: string }).Note;
    if (typeof throttled === 'string') {
      const logger = createLogger({ scope: 'investments:alphavantage' });
      logger.warn('Alpha Vantage throttled request', throttled);
    }
    return null;
  }

  const rows = Object.entries(timeSeries)
    .map(([date, metrics]) => ({
      date: new Date(date),
      close: Number(metrics['5. adjusted close'] ?? metrics['4. close'] ?? metrics.close),
    }))
    .filter((row) => !Number.isNaN(row.date.getTime()) && Number.isFinite(row.close))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (rows.length < 2) {
    return null;
  }

  const latest = rows[rows.length - 1];
  const sixMonthsAgo = new Date(latest.date.getTime() - 182 * MS_IN_DAY);

  let reference: SeriesRow | null = null;
  for (let index = rows.length - 2; index >= 0; index -= 1) {
    const candidate = rows[index];
    if (candidate.date <= sixMonthsAgo) {
      reference = candidate;
      break;
    }
  }

  if (!reference) {
    reference = rows[0];
  }

  if (!reference || reference.close <= 0 || latest.close <= 0) {
    return null;
  }

  const change = ((latest.close - reference.close) / reference.close) * 100;
  const rounded = Number(change.toFixed(2));
  return Number.isFinite(rounded) ? rounded : null;
}
