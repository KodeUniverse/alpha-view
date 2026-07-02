import { OHLCVData, Ticker } from "@shared/types";

export default interface MarketDataProvider {
  startLiveTickerFeed: (
    ticker: Ticker,
    onTick: (data: unknown) => void,
  ) => void;
  stopLiveTickerFeed: () => void;
  getSymbolList: () => Promise<Ticker[]>;
}
