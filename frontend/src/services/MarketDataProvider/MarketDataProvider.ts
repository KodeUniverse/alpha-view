import { Frequency, OHLCVData, Ticker } from "@shared/types";

type MarketDataProviderName = "alpaca" | "finnhub";

interface MarketDataProvider {
  startLiveTickerFeed?: (
    tickers: Ticker[],
    onTick: (data: unknown) => void,
  ) => void;
  stopLiveTickerFeed?: () => void;
  getSymbolList?: () => Promise<Ticker[]>;
  getBars?: (
    tickers: Ticker[],
    freq: Frequency,
    start: Date,
    end: Date,
  ) => Promise<Record<string, OHLCVData[]>>;
  getBarsForTicker?: (
    ticker: Ticker,
    freq: Frequency,
    start: Date,
    end: Date,
  ) => Promise<OHLCVData[]>;
  getBasicFinancials?: (ticker: Ticker) => Promise<unknown>;
  getMarketNews?: (category: string) => Promise<unknown>;
}
export type { MarketDataProviderName, MarketDataProvider };
