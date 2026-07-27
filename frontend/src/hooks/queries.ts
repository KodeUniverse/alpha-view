import { useQuery } from "@tanstack/react-query";
import api from "@/api/client";

import { Frequency, Ticker, NewsCategory } from "@shared/types";

export function useSymbolList() {
  return useQuery({
    queryKey: ["symbolList"],
    queryFn: () => api.getSymbols(),
  });
}

export function useBarsForTicker(
  ticker: Ticker,
  freq: Frequency,
  start: Date,
  end: Date,
) {
  return useQuery({
    queryKey: [
      "barsForTicker",
      ticker.symbol,
      freq,
      start.getTime(),
      end.getTime(),
    ],
    queryFn: () => api.getBarsForTicker(ticker, freq, start, end),
  });
}

export function useBars(
  tickers: Ticker[],
  freq: Frequency,
  start: Date,
  end: Date,
) {
  return useQuery({
    queryKey: [
      "useBars",
      JSON.stringify(tickers),
      freq,
      start.getTime(),
      end.getTime(),
      symbols,
    ],
    queryFn: () => api.getBars(tickers, freq, start, end),
  });
}

export function useMarketNews(category: NewsCategory) {
  return useQuery({
    queryKey: ["news", category],
    queryFn: () => api.getNews(category),
  });
}

export function useBasicFinancials(ticker: Ticker) {
  return useQuery({
    queryKey: ["financials", ticker.symbol],
    queryFn: () => api.getFinancials(ticker),
  });
}
