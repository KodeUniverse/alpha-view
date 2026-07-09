import { Frequency, NewsCategory, OHLCVData, Ticker } from "@shared/types";

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
  getMarketNews?: (category: NewsCategory) => Promise<unknown>;
}
export type { MarketDataProvider };
