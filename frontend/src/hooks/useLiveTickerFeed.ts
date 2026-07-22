import { useAlpacaDataProvider } from "@/services/MarketDataProvider/MarketDataContext";
import { OHLCVData, Ticker, LiveTickerFeedMessage } from "@shared/types";
import { useState, useEffect } from "react";

export function useLiveTickerFeed(tickers: Ticker[]): LiveTickerFeedMessage {
  // currently MarketDataProvider is implemented such that
  // multiple uses of this hook will kill any other use of itself.
  // This means only one feed can be active per MarketDataProvider.
  const provider = useAlpacaDataProvider();
  const [currMinuteBar, setCurrMinuteBar] = useState<OHLCVData | null>(null);
  const [currDailyBar, setCurrDailyBar] = useState<OHLCVData | null>(null);

  useEffect(() => {
    provider.startLiveTickerFeed(tickers, (data) => {
      if (data.frequency === "intraday") setCurrMinuteBar(data);
      else setCurrDailyBar(data);
    });

    return () => provider.stopLiveTickerFeed();
  }, [JSON.stringify(tickers)]);
  return { dailyBar: currDailyBar, minuteBar: currMinuteBar };
}
