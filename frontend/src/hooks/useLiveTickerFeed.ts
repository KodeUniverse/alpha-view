import { useMarketDataProvider } from "@/services/MarketDataProvider/MarketDataContext";
import { Ticker } from "@shared/types";
import { useState, useEffect } from "react";

export function useLiveTickerFeed(ticker: Ticker) {
  // currently MarketDataProvider is implemented such that
  // multiple uses of this hook will kill any other use of itself.
  // This means only one feed can be active per MarketDataProvider.
  const provider = useMarketDataProvider();
  const [currTick, setCurrTick] = useState(null);

  useEffect(() => {
    provider.startLiveTickerFeed(ticker, (data) => {
      setCurrTick(data);
    });

    return () => provider.stopLiveTickerFeed();
  }, [ticker.symbol]);
  return currTick;
}
