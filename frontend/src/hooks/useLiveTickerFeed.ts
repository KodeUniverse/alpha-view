import api, { FeedSocketState } from "@/api/client";
import { OHLCVData, Ticker, LiveTickerFeedMessage } from "@/types";
import { useState, useEffect, useCallback } from "react";

export function useLiveTickerFeed(
  tickers: Ticker[],
): Record<string, LiveTickerFeedMessage> {
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
    if (tickers.length === 0) return;

    api.subscribeTickers(tickers, onTick);
    return () => {
      api.unsubscribeTickers(tickers, onTick);
    };
  }, [onTick, JSON.stringify(tickers.map((t) => t.symbol))]);

  return messages;
}

// This tab's own connection to the backend relay, which /health cannot report: the backend
// can be perfectly healthy while this socket is dead. Lives beside the feed hook because it
// is the same lifecycle.
export function useFeedSocketState(): FeedSocketState {
  const [state, setState] = useState<FeedSocketState>("connecting");

  useEffect(() => {
    // Read once up front: the socket may already be open (StrictMode remounts, a late
    // subscription) and the listener only fires on transitions.
    setState(api.getFeedState());
    return api.subscribeFeedState(setState);
  }, []);

  return state;
}
