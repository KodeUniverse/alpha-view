import { ProviderQueryResponse, useProviderQuery } from "./useProviderQuery";
import {
  Frequency,
  Ticker,
  OHLCVData,
  NewsCategory,
  NewsArticle,
  StockBasicFinancials,
} from "@shared/types";

export function useSymbolList(): ProviderQueryResponse<Ticker[]> {
  return useProviderQuery([], (provider) => provider.getSymbolList(), "alpaca");
}

export function useBarsForTicker(
  ticker: Ticker,
  freq: Frequency,
  start: Date,
  end: Date,
): ProviderQueryResponse<OHLCVData[]> {
  return useProviderQuery(
    [ticker.symbol, freq, start.getTime(), end.getTime()],
    (provider) => provider.getBarsForTicker(ticker, freq, start, end),
    "alpaca",
  );
}

export function useBars(
  tickers: Ticker[],
  freq: Frequency,
  start: Date,
  end: Date,
): ProviderQueryResponse<Record<string, OHLCVData[]>> {
  // think about useMemo'ing this tickers array
  return useProviderQuery(
    [
      tickers.map((t) => t.symbol).join(","),
      freq,
      start.getTime(),
      end.getTime(),
    ],
    (provider) => provider.getBars(tickers, freq, start, end),
    "alpaca",
  );
}

export function useMarketNews(
  category: NewsCategory,
): ProviderQueryResponse<NewsArticle[]> {
  return useProviderQuery(
    [category],
    (provider) => provider.getMarketNews(category),
    "finnhub",
  );
}

export function useBasicFinancials(
  ticker: Ticker,
): ProviderQueryResponse<StockBasicFinancials | undefined> {
  return useProviderQuery(
    [ticker.symbol],
    (provider) => provider.getBasicFinancials(ticker),
    "finnhub",
  );
}
