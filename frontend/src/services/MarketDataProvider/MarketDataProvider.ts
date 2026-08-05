import { OHLCVData, Ticker } from "@shared/types";

// REST data (bars, news, symbols, financials, watchlist) is fetched through
// the backend via @/api/client -- see hooks/queries.ts. This provider is
// only responsible for the live ticker WebSocket feed.
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
}
export type { MarketDataProvider };
