import {
  Frequency,
  NewsArticle,
  NewsCategory,
  OHLCVData,
  Ticker,
} from "@shared/types";

interface MarketDataProvider {
  startLiveTickerFeed?: (
    tickers: Ticker[],
    onTick: (data: OHLCVData) => void,
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
  // TODO: type these unknowns. transform data inside fetch before returning
  getBasicFinancials?: (ticker: Ticker) => Promise<unknown>;
  getMarketNews?: (category: NewsCategory) => Promise<NewsArticle[]>;
}
export type { MarketDataProvider };
