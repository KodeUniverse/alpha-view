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
};

export default api;
