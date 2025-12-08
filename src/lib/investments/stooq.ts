const STOOQ_ENDPOINT = 'https://stooq.com/q/d/l/';

type DailyQuote = {
  date: Date;
  close: number;
};

const MS_IN_DAY = 24 * 60 * 60 * 1000;

export async function fetchStooqSixMonthPerformance(symbol: string): Promise<number | null> {
  const trimmed = symbol.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }

  const url = `${STOOQ_ENDPOINT}?s=${encodeURIComponent(trimmed)}&i=d`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Stooq request failed with status ${response.status}`);
  }

  const csv = await response.text();
  const quotes = parseCsv(csv);
  if (quotes.length < 2) {
    return null;
  }

  const latest = quotes[quotes.length - 1];
  const sixMonthsAgo = new Date(latest.date.getTime() - 182 * MS_IN_DAY);

  let reference: DailyQuote | null = null;
  for (let index = quotes.length - 2; index >= 0; index -= 1) {
    const quote = quotes[index];
    if (quote.date <= sixMonthsAgo) {
      reference = quote;
      break;
    }
  }

  if (!reference) {
    reference = quotes[0];
  }

  if (!reference || reference.close <= 0) {
    return null;
  }

  const change = ((latest.close - reference.close) / reference.close) * 100;
  return Number.isFinite(change) ? Number(change.toFixed(2)) : null;
}

function parseCsv(csv: string): DailyQuote[] {
  const lines = csv.trim().split('\n').filter(Boolean);
  const rows = lines.slice(1); // Skip header.
  const quotes: DailyQuote[] = [];

  rows.forEach((line) => {
    const [date, , , , close] = line.split(',');
    const parsedDate = new Date(date);
    const parsedClose = Number(close);
    if (!Number.isNaN(parsedDate.getTime()) && Number.isFinite(parsedClose)) {
      quotes.push({ date: parsedDate, close: parsedClose });
    }
  });

  return quotes;
}
