import {
  Frequency,
  OHLCVData,
  Ticker,
  NewsArticle,
  NewsCategory,
  StockBasicFinancials,
} from "@shared/types";

async function apiFetch<T>(
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  const endpoint = new URL(`${import.meta.env.API_URL}${path}`);

  if (params) {
    Object.entries(params).map(([k, v]) => {
      endpoint.searchParams.set(k, v);
    });
  }

  const res = await fetch(endpoint);

  if (!res.ok)
    throw new Error(
      `HTTP ${res.status}: API fetch failed on endpoint ${endpoint}`,
    );

  const data = await res.json();

  return data;
}

const api = {
  getBars: async (
    tickers: Ticker[],
    freq: Frequency,
    start: Date,
    end: Date,
  ) => {
    return await apiFetch<OHLCVData[]>("/api/bars", {
      symbols: tickers.map((ticker) => ticker.symbol as string).join(","),
      freq,
      start: start.toDateString(),
      end: end.toDateString(),
    });
  },
  getBarsForTicker: async (
    ticker: Ticker,
    freq: Frequency,
    start: Date,
    end: Date,
  ) => {
    return await apiFetch<OHLCVData[]>("/api/bars", {
      symbols: ticker.symbol,
      freq,
      start: start.toDateString(),
      end: end.toDateString(),
    });
  },
  getNews: async (category: NewsCategory) => {
    return await apiFetch<NewsArticle[]>("/api/news", { category });
  },
  getSymbols: async () => {
    return await apiFetch<Ticker[]>("/api/symbols");
  },
  getFinancials: async (ticker: Ticker) => {
    return await apiFetch<StockBasicFinancials>(
      `/api/financials/${ticker.symbol}`,
    );
  },
};

export default api;
