import { Frequency, OHLCVData, Ticker } from "@shared/types";

export default interface MarketDataProvider {
  startLiveTickerFeed: (
    tickers: Ticker[],
    onTick: (data: unknown) => void,
  ) => void;
  stopLiveTickerFeed: () => void;
  getSymbolList: () => Promise<Ticker[]>;
  getBars: (
    tickers: Ticker[],
    freq: Frequency,
    start: Date,
    end: Date,
  ) => Promise<Record<string, OHLCVData[]>>;
  getBarsForTicker: (
    ticker: Ticker,
    freq: Frequency,
    start: Date,
    end: Date,
  ) => Promise<OHLCVData[]>;
}
