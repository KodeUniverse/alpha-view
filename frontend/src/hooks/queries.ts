import { ProviderQueryResponse, useProviderQuery } from "./useProviderQuery";
import { Frequency, Ticker, OHLCVData } from "@shared/types";

export function useSymbolList(): ProviderQueryResponse<Ticker[]> {
  return useProviderQuery([], (provider) => provider.getSymbolList());
}

export function useBarsForTicker(
  ticker: Ticker,
  freq: Frequency,
  start: Date,
  end: Date,
): ProviderQueryResponse<OHLCVData[]> {
  return useProviderQuery([ticker.symbol, freq, start, end], (provider) =>
    provider.getBarsForTicker(ticker, freq, start, end),
  );
}

export function useBars(
  tickers: Ticker[],
  freq: Frequency,
  start: Date,
  end: Date,
): ProviderQueryResponse<Record<string, OHLCVData[]>> {
  return useProviderQuery([tickers, freq, start, end], (provider) =>
    provider.getBars(tickers, freq, start, end),
  );
}
