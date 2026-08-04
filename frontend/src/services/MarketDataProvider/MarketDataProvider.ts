import {
  Frequency,
  NewsArticle,
  NewsCategory,
  OHLCVData,
  StockBasicFinancials,
  Ticker,
} from "@shared/types";

interface MarketDataProvider {
  subscribeTickers?: (
    tickers: Ticker[],
    onTick: (data: OHLCVData) => void,
  ) => void;
  unsubscribeTickers?: (
    tickers: Ticker[],
    onTick: (data: OHLCVData) => void,
  ) => void;
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
  getBasicFinancials?: (
    ticker: Ticker,
  ) => Promise<StockBasicFinancials | undefined>;
  getMarketNews?: (category: NewsCategory) => Promise<NewsArticle[]>;
}
export type { MarketDataProvider };
