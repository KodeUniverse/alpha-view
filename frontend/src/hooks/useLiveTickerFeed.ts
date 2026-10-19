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

    const symbols = new Set(tickers.map((t) => t.symbol));
    // Drop messages for symbols we are no longer subscribed to. Their timestamps are stale
    // by exactly the length of the gap we were not listening, and a stale timestamp reads
    // as "no data for X minutes" -- a feed fault that never happened. Returning `prev`
    // unchanged when there is nothing to drop lets React bail out of the re-render.
    setMessages((prev) => {
      const next: Record<string, LiveTickerFeedMessage> = {};
      let dropped = false;
      for (const [symbol, message] of Object.entries(prev)) {
        if (symbols.has(symbol)) {
          next[symbol] = message;
        } else {
          dropped = true;
        }
      }
      return dropped ? next : prev;
    });

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
