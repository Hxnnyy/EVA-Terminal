export type InvestmentProvider = 'stooq' | 'alphavantage';

export type InvestmentRecord = {
  id: string;
  ticker: string;
  label: string | null;
  order: number;
  provider: InvestmentProvider;
  providerSymbol: string | null;
  perf6mPercent: number | null;
  perfLastFetched: string | null;
};
