import { useAlpacaDataProvider } from "@/services/MarketDataProvider/MarketDataContext";
import { OHLCVData, Ticker, LiveTickerFeedMessage } from "@shared/types";
import { useState, useEffect, useCallback } from "react";

export function useLiveTickerFeed(
  tickers: Ticker[],
): Record<string, LiveTickerFeedMessage> {
  const provider = useAlpacaDataProvider();
  const [messages, setMessages] = useState<Record<string, LiveTickerFeedMessage>>({});

  const onTick = useCallback((data: OHLCVData) => {
    setMessages((prev) => {
      const symbol = data.symbol;
      if (!symbol) return prev;
      const curr = prev[symbol] ?? { dailyBar: null, minuteBar: null };
      return {
        ...prev,
        [symbol]: {
          dailyBar:
            data.frequency === "daily"
              ? data
              : curr.dailyBar,
          minuteBar:
            data.frequency === "intraday"
              ? data
              : curr.minuteBar,
        },
      };
    });
  }, []);

  useEffect(() => {
    if (!provider?.subscribeTickers || !provider?.unsubscribeTickers) return;
    if (tickers.length === 0) return;

    provider.subscribeTickers(tickers, onTick);
    return () => {
      provider.unsubscribeTickers!(tickers, onTick);
    };
  }, [provider, onTick, JSON.stringify(tickers.map((t) => t.symbol))]);

  return messages;
}
