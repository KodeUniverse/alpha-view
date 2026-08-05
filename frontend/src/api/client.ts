import {
    Frequency,
    OHLCVData,
    Ticker,
    NewsArticle,
    NewsCategory,
} from "@shared/types";
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
const TickerSchema = z.object({
    symbol: z.string(),
    name: z.string().optional(),
    exchange: z.string().optional()
}) satisfies z.ZodType<Ticker>;
const TickerArraySchema = z.array(TickerSchema);

const NewsArticleSchema = z.object({
    id: z.number(),
    headline: z.string(),
    datetime: z.coerce.date(),
    url: z.string(),
    source: z.string(),
    category: z.enum(["general", "forex", "crypto", "merger", "technology", "business", "top news"]).optional(),
    image: z.string().optional(),
    summary: z.string().optional()
}) satisfies z.ZodType<NewsArticle>;
const NewsArticleArraySchema = z.array(NewsArticleSchema);

const OHLCVSchema = z.object({
    time: z.coerce.date(),
    open: z.number(),
    high: z.number(),
    low: z.number(),
    close: z.number(),
    volume: z.number(),
    symbol: z.string().optional(),
    frequency: z.enum(["intraday", "daily", "weekly", "monthly"]).optional(),
}) satisfies z.ZodType<OHLCVData>;
const OHLCVArraySchema = z.array(OHLCVSchema);
const OHLCVBySymbolSchema = z.record(z.string(), OHLCVArraySchema);

const WatchlistTickerSchema = z.object({
    symbol: z.string(),
    name: z.string().optional(),
}) satisfies z.ZodType<Ticker>;
const WatchlistArraySchema = z.array(WatchlistTickerSchema);

// --- Live ticker feed -------------------------------------------------
//
// Alpaca only allows a single upstream WebSocket connection per account, so
// the backend owns that connection and relays bar messages down to a single
// /ws/live endpoint (see backend/src/providers/alpacaStream.ts). This class
// is a module-level singleton -- there is only ever one connection to that
// endpoint for the whole app, no matter how many components subscribe.
interface AlpacaBarMessage {
    T: "b" | "d";
    S: string;
    o: number;
    h: number;
    l: number;
    c: number;
    v: number;
    vw: number;
    n: number;
    t: string;
}

type LiveTickListener = (data: OHLCVData) => void;

const LIVE_FEED_RECONNECT_DELAY_MS = 2000;

class LiveTickerFeed {
    private socket?: WebSocket;
    private intentionalClose = false;
    private reconnectTimeout?: ReturnType<typeof setTimeout>;
    private readonly subscriptions = new Set<string>();
    private readonly listeners = new Map<string, Set<LiveTickListener>>();

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
            // (Re)send the full subscription set -- covers both the first
            // connection and any reconnect after a drop.
            this.sendSubscribe(Array.from(this.subscriptions));
        });
        this.socket.addEventListener("close", (event) => {
            if (event.target !== this.socket) return; // stale socket, ignore. socket.close() is async
            if (this.intentionalClose) return;
            console.log(
                "Live ticker feed disconnected, reconnecting in 2 seconds...",
            );
            this.reconnectTimeout = setTimeout(() => {
                if (this.subscriptions.size > 0) this.open();
            }, LIVE_FEED_RECONNECT_DELAY_MS);
        });
        this.socket.addEventListener("error", () => {
            console.error("Live ticker feed WebSocket error.");
        });
        this.socket.addEventListener("message", (msg) => {
            let messages: AlpacaBarMessage[];
            try {
                messages = JSON.parse(msg.data);
            } catch {
                console.error(`Malformed message from live ticker feed: ${msg.data}`);
                return;
            }
            for (const data of messages) {
                this.handleBarMessage(data);
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
            JSON.stringify({ action: "subscribe", bars: symbols, dailyBars: symbols }),
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
            JSON.stringify({ action: "unsubscribe", bars: symbols, dailyBars: symbols }),
        );
    }

    private handleBarMessage(data: AlpacaBarMessage) {
        const transformed: OHLCVData = {
            open: data.o,
            close: data.c,
            high: data.h,
            low: data.l,
            volume: data.v,
            time: new Date(data.t),
            symbol: data.S,
            frequency: data.T === "b" ? "intraday" : "daily",
        };
        const listeners = this.listeners.get(data.S);
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
        // The backend always responds with bars keyed by symbol, regardless
        // of how many symbols were requested.
        const result = OHLCVBySymbolSchema.parse(data);
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
    // TODO: figure out a way to validate this and finalize the shape of this stock financials interface.
    getFinancials: async (ticker: Ticker) => {
        return await apiFetch(
            `/api/financials/${ticker.symbol}`,
        );
    },
    getWatchlist: async (): Promise<Ticker[]> => {
        const data = await apiFetch("/api/watchlist");
        const result = WatchlistArraySchema.parse(data);
        return result;
    },
    addToWatchlist: async (ticker: Ticker): Promise<Ticker> => {
        const data = await apiFetch(
            "/api/watchlist",
            undefined,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    symbol: ticker.symbol,
                    name: ticker.name,
                }),
            },
        );
        const result = WatchlistTickerSchema.parse(data);
        return result;
    },
    removeFromWatchlist: async (symbol: string): Promise<void> => {
        await apiFetch(`/api/watchlist/${symbol}`, undefined, {
            method: "DELETE",
        });
    },
    subscribeTickers: (tickers: Ticker[], onTick: LiveTickListener): void => {
        liveTickerFeed.subscribe(tickers, onTick);
    },
    unsubscribeTickers: (tickers: Ticker[], onTick: LiveTickListener): void => {
        liveTickerFeed.unsubscribe(tickers, onTick);
    },
};

export default api;
