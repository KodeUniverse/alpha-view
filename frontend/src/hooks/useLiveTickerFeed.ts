import { useMarketDataProvider } from "@/services/MarketDataProvider/MarketDataContext";
import { OHLCVData, Ticker } from "@shared/types";
import { useState, useEffect } from "react";

export function useLiveTickerFeed(tickers: Ticker[]): OHLCVData {
  // currently MarketDataProvider is implemented such that
  // multiple uses of this hook will kill any other use of itself.
  // This means only one feed can be active per MarketDataProvider.
  const provider = useMarketDataProvider();
  const [currTick, setCurrTick] = useState(null);

  useEffect(() => {
    provider.startLiveTickerFeed(tickers, (data) => {
      setCurrTick(data);
    });

    return () => provider.stopLiveTickerFeed();
  }, [JSON.stringify(tickers)]);
  return currTick;
}
