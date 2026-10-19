import {
  Frequency,
  OHLCVData,
  Ticker,
  NewsArticle,
  NewsCategory,
  OHLCVDataSchema,
  TickerSchema,
  NewsArticleSchema,
  WatchListSchema,
  WatchList,
  WatchListTickerSchema,
  WatchListTicker,
  MarketClock,
  MarketClockSchema,
  FeedHealth,
  FeedHealthSchema,
} from "@/types";
import * as z from "zod";

async function apiFetch(
  path: string,
  params?: Record<string, string>,
  init?: RequestInit,
): Promise<unknown> {
  const endpoint = new URL(`${import.meta.env.API_URL}${path}`);

  if (params) {
    Object.entries(params).map(([k, v]) => {
      endpoint.searchParams.set(k, v);
    });
  }

  const res = await fetch(endpoint, init);

  if (!res.ok)
    throw new Error(
      `HTTP ${res.status}: API fetch failed on endpoint ${endpoint}`,
    );

  if (res.status === 204) return undefined;
  const data = await res.json();
  return data;
}

// `/health` answers 503 when the feed is degraded, and that IS the answer we asked for --
// the body is identical either way, only the status differs. apiFetch throws on any non-ok,
// which would turn a readable `"status": "degraded"` into an opaque network error, so this
// path reads the body regardless of status code.
async function apiFetchAllowingStatus(path: string): Promise<unknown> {
  const endpoint = new URL(`${import.meta.env.API_URL}${path}`);
  const res = await fetch(endpoint);
  if (res.status === 204) return undefined;
  return await res.json();
}
const TickerArraySchema = z.array(TickerSchema);

const NewsArticleArraySchema = z.array(NewsArticleSchema);

const OHLCVArraySchema = z.array(OHLCVDataSchema);
const OHLCVBySymbolSchema = z.record(z.string(), OHLCVArraySchema);

const WatchListArraySchema = z.array(WatchListSchema);

const WatchListItemsSchema = z.array(WatchListTickerSchema);

// Connects to the backend's /ws/live relay (backend/src/providers/alpacaStream.ts),
// which owns the actual Alpaca connection. Instantiated once below as a
// module-level singleton, so the whole app shares one WebSocket.
const LiveBarPayloadSchema = z.object({
  symbol: z.string(),
  timestamp: z.string(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
  trade_count: z.number().nullable(),
  vwap: z.number().nullable(),
});

const LiveFeedEnvelopeSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("minute_bar"), bar: LiveBarPayloadSchema }),
  z.object({ type: z.literal("daily_bar"), bar: LiveBarPayloadSchema }),
  z.object({ type: z.literal("error"), message: z.string() }),
]);
type LiveFeedEnvelope = z.infer<typeof LiveFeedEnvelopeSchema>;

type LiveTickListener = (data: OHLCVData) => void;

const LIVE_FEED_RECONNECT_DELAY_MS = 2000;

/**
 * This browser tab's connection to the backend relay.
 *
 * Distinct from the backend's own view of Alpaca, which `/health` reports: a sleeping
 * laptop or a network blip leaves the backend perfectly healthy while this tab receives
 * nothing. Both are needed to tell "the pipeline is fine" from "I am receiving".
 */
export type FeedSocketState = "connecting" | "open" | "closed";

function toFeedSocketState(socket?: WebSocket): FeedSocketState {
  if (!socket) return "closed";
  if (socket.readyState === WebSocket.OPEN) return "open";
  if (socket.readyState === WebSocket.CONNECTING) return "connecting";
  return "closed";
}

class LiveTickerFeed {
  private socket?: WebSocket;
  private intentionalClose = false;
  private reconnectTimeout?: ReturnType<typeof setTimeout>;
  private readonly subscriptions = new Set<string>();
  private readonly listeners = new Map<string, Set<LiveTickListener>>();
  private readonly stateListeners = new Set<(state: FeedSocketState) => void>();

  getState(): FeedSocketState {
    if (this.socket) return toFeedSocketState(this.socket);
    // No socket on a fresh page load means "not started yet", not "disconnected" -- without
    // this the status indicator reports FEED DOWN before the mount effect has run once.
    return this.subscriptions.size > 0 ? "closed" : "connecting";
  }

  subscribeState(listener: (state: FeedSocketState) => void): () => void {
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  private notifyState(): void {
    const state = this.getState();
    for (const listener of this.stateListeners) listener(state);
  }

  subscribe(tickers: Ticker[], onTick: LiveTickListener) {
    const added: string[] = [];
    for (const ticker of tickers) {
      if (!ticker.symbol) continue;
      if (!this.subscriptions.has(ticker.symbol)) added.push(ticker.symbol);
      this.subscriptions.add(ticker.symbol);
      let listeners = this.listeners.get(ticker.symbol);
      if (!listeners) {
        listeners = new Set();
        this.listeners.set(ticker.symbol, listeners);
      }
      listeners.add(onTick);
    }
    this.ensureConnected();
    this.sendSubscribe(added);
  }

  unsubscribe(tickers: Ticker[], onTick: LiveTickListener) {
    const removed: string[] = [];
    for (const ticker of tickers) {
      if (!ticker.symbol) continue;
      const listeners = this.listeners.get(ticker.symbol);
      if (!listeners) continue;
      listeners.delete(onTick);
      if (listeners.size === 0) {
        this.listeners.delete(ticker.symbol);
        this.subscriptions.delete(ticker.symbol);
        removed.push(ticker.symbol);
      }
    }
    if (this.subscriptions.size === 0) {
      this.stop();
    } else if (removed.length > 0) {
      this.sendUnsubscribe(removed);
    }
  }

  private ensureConnected() {
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }
    this.open();
  }

  private open() {
    this.intentionalClose = false;

    const apiUrl: string = import.meta.env.API_URL;
    this.socket = new WebSocket(`${apiUrl.replace(/^http/, "ws")}/ws/live`);

    this.socket.addEventListener("open", () => {
      console.log("Live ticker feed connected.");
      this.notifyState();
      this.sendSubscribe(Array.from(this.subscriptions)); // covers reconnects too
    });
    this.socket.addEventListener("close", (event) => {
      if (event.target !== this.socket) return; // ignore stale socket (close is async)
      if (this.intentionalClose) return;
      console.log(
        "Live ticker feed disconnected, reconnecting in 2 seconds...",
      );
      this.notifyState();
      this.reconnectTimeout = setTimeout(() => {
        if (this.subscriptions.size > 0) this.open();
      }, LIVE_FEED_RECONNECT_DELAY_MS);
    });
    this.socket.addEventListener("error", () => {
      console.error("Live ticker feed WebSocket error.");
    });
    this.socket.addEventListener("message", (msg) => {
      try {
        const envelope = LiveFeedEnvelopeSchema.parse(JSON.parse(msg.data));
        if (envelope.type === "error") {
          console.error(`Live ticker feed server error: ${envelope.message}`);
          return;
        }
        this.handleBarMessage(envelope);
      } catch (err) {
        console.error(
          `Malformed message from live ticker feed: ${msg.data}`,
          err,
        );
      }
    });
  }

  private sendSubscribe(symbols: string[]) {
    if (
      !this.socket ||
      this.socket.readyState !== WebSocket.OPEN ||
      symbols.length === 0
    )
      return;
    this.socket.send(
      JSON.stringify({
        action: "subscribe",
        bars: symbols,
        dailyBars: symbols,
      }),
    );
  }

  private sendUnsubscribe(symbols: string[]) {
    if (
      !this.socket ||
      this.socket.readyState !== WebSocket.OPEN ||
      symbols.length === 0
    )
      return;
    this.socket.send(
      JSON.stringify({
        action: "unsubscribe",
        bars: symbols,
        dailyBars: symbols,
      }),
    );
  }

  private handleBarMessage(
    envelope: Extract<LiveFeedEnvelope, { type: "minute_bar" | "daily_bar" }>,
  ) {
    const { bar } = envelope;
    const transformed: OHLCVData = {
      open: bar.open,
      close: bar.close,
      high: bar.high,
      low: bar.low,
      volume: bar.volume,
      time: new Date(bar.timestamp),
      symbol: bar.symbol,
      frequency: envelope.type === "minute_bar" ? "intraday" : "daily",
    };
    // Arrival time, not Alpaca's stamp: the feed-status indicator measures whether data is
    // still coming in, and doing that against exchange-local timestamps would drag the
    // viewer's timezone and clock skew into the result.
    transformed.receivedAt = Date.now();
    const listeners = this.listeners.get(bar.symbol);
    if (!listeners) return;
    for (const listener of listeners) listener(transformed);
  }

  private stop() {
    this.intentionalClose = true;
    clearTimeout(this.reconnectTimeout);
    this.socket?.close();
    this.socket = undefined;
    this.listeners.clear();
    this.subscriptions.clear();
  }
}

const liveTickerFeed = new LiveTickerFeed();

const api = {
  getBars: async (
    tickers: Ticker[],
    freq: Frequency,
    start: Date,
    end: Date,
  ): Promise<OHLCVData[]> => {
    const data = await apiFetch("/api/bars", {
      symbols: tickers.map((ticker) => ticker.symbol as string).join(","),
      freq,
      start: start.toDateString(),
      end: end.toDateString(),
    });
    const result = OHLCVBySymbolSchema.parse(data); // always keyed by symbol
    return Object.values(result).flat();
  },
  getBarsForTicker: async (
    ticker: Ticker,
    freq: Frequency,
    start: Date,
    end: Date,
  ): Promise<OHLCVData[]> => {
    const data = await apiFetch("/api/bars", {
      symbols: ticker.symbol,
      freq,
      start: start.toISOString(),
      end: end.toISOString(),
    });

    const result = OHLCVBySymbolSchema.parse(data);

    return result[ticker.symbol] ?? [];
  },
  getBarsBySymbol: async (
    tickers: Ticker[],
    freq: Frequency,
    start: Date,
    end: Date,
  ): Promise<Record<string, OHLCVData[]>> => {
    const data = await apiFetch("/api/bars", {
      symbols: tickers.map((t) => t.symbol).join(","),
      freq,
      start: start.toISOString(),
      end: end.toISOString(),
    });
    const result = OHLCVBySymbolSchema.parse(data);
    return result;
  },
  getNews: async (category: NewsCategory): Promise<NewsArticle[]> => {
    const data = await apiFetch("/api/news", { category });
    const result = NewsArticleArraySchema.parse(data);
    return result;
  },
  getSymbols: async (): Promise<Ticker[]> => {
    const data = await apiFetch("/api/symbols");
    const result = TickerArraySchema.parse(data);
    return result;
  },
  getMarketClock: async (): Promise<MarketClock> => {
    const data = await apiFetch("/api/clock");
    const result = MarketClockSchema.parse(data);
    return result;
  },
  getFeedHealth: async (): Promise<FeedHealth> => {
    const data = await apiFetchAllowingStatus("/health");
    const result = FeedHealthSchema.parse(data);
    return result;
  },
  // TODO: figure out a way to validate this and finalize the shape of this stock financials interface.
  getFinancials: async (ticker: Ticker) => {
    return await apiFetch(`/api/financials/${ticker.symbol}`);
  },
  getWatchLists: async (): Promise<WatchList[]> => {
    const data = await apiFetch("/api/watchlists");
    const result = WatchListArraySchema.parse(data);
    return result;
  },
  getWatchListItems: async (listId: number) => {
    const items = await apiFetch(`/api/watchlists/${listId}/items`);
    const result = WatchListItemsSchema.parse(items);
    return result;
  },
  createWatchList: async (listName: string): Promise<WatchList> => {
    const res = await apiFetch("/api/watchlists", undefined, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ list_name: listName }),
    });
    const validated = WatchListSchema.parse(res);
    return validated;
  },
  addToWatchList: async (
    ticker: Ticker,
    listId: number,
    // Omitted on purpose: the backend appends at the end (max SortId + 1) only when
    // this is absent. Sending 0 collides with UniqueConstraint(ListId, SortId).
    sortId?: number,
  ): Promise<WatchListTicker> => {
    const data = await apiFetch(`/api/watchlists/${listId}/items`, undefined, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticker: ticker.symbol,
        name: ticker.name,
        sort_id: sortId,
      }),
    });
    const result = WatchListTickerSchema.parse(data);
    return result;
  },
  removeFromWatchList: async (
    ticker: Ticker,
    listId: number,
  ): Promise<void> => {
    await apiFetch(
      `/api/watchlists/${listId}/items/${ticker.symbol}`,
      undefined,
      {
        method: "DELETE",
      },
    );
  },
  deleteWatchList: async (listId: number): Promise<void> => {
    await apiFetch(`/api/watchlists/${listId}`, undefined, {
      method: "DELETE",
    });
  },
  // The route takes list_name as a bare `str` param, so FastAPI reads it off the
  // query string instead of a JSON body.
  renameWatchList: async (
    listId: number,
    listName: string,
  ): Promise<void> => {
    await apiFetch(
      `/api/watchlists/${listId}`,
      { list_name: listName },
      {
        method: "PATCH",
      },
    );
  },
  subscribeTickers: (tickers: Ticker[], onTick: LiveTickListener): void => {
    liveTickerFeed.subscribe(tickers, onTick);
  },
  unsubscribeTickers: (tickers: Ticker[], onTick: LiveTickListener): void => {
    liveTickerFeed.unsubscribe(tickers, onTick);
  },
  getFeedState: (): FeedSocketState => liveTickerFeed.getState(),
  subscribeFeedState: (listener: (state: FeedSocketState) => void): (() => void) =>
    liveTickerFeed.subscribeState(listener),
};

export default api;
