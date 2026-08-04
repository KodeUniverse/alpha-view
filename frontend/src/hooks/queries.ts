import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api/client";

import { Frequency, Ticker, NewsCategory } from "@shared/types";

export function useWatchlist() {
    return useQuery({
        queryKey: ["watchlist"],
        queryFn: () => api.getWatchlist(),
    });
}

export function useAddToWatchlist() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (ticker: Ticker) => api.addToWatchlist(ticker),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["watchlist"] });
        },
    });
}

export function useRemoveFromWatchlist() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (symbol: string) => api.removeFromWatchlist(symbol),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["watchlist"] });
        },
    });
}

export function useSymbolList() {
    return useQuery({
        queryKey: ["symbolList"],
        queryFn: () => api.getSymbols(),
    });
}

export function useBarsForTicker(
    ticker: Ticker,
    freq: Frequency,
    start: Date,
    end: Date,
) {
    return useQuery({
        queryKey: [
            "barsForTicker",
            ticker.symbol,
            freq,
            start.getTime(),
            end.getTime(),
        ],
        queryFn: () => api.getBarsForTicker(ticker, freq, start, end),
    });
}

export function useBars(
    tickers: Ticker[],
    freq: Frequency,
    start: Date,
    end: Date,
) {
    return useQuery({
        queryKey: [
            "useBars",
            JSON.stringify(tickers),
            freq,
            start.getTime(),
            end.getTime(),
        ],
        queryFn: () => api.getBars(tickers, freq, start, end),
        enabled: tickers.length > 0,
    });
}

export function useBarsBySymbol(
    tickers: Ticker[],
    freq: Frequency,
    start: Date,
    end: Date,
) {
    return useQuery({
        queryKey: [
            "barsBySymbol",
            JSON.stringify(tickers.map((t) => t.symbol)),
            freq,
            start.getTime(),
            end.getTime(),
        ],
        queryFn: () => api.getBarsBySymbol(tickers, freq, start, end),
        enabled: tickers.length > 0,
    });
}

export function useMarketNews(category: NewsCategory) {
    return useQuery({
        queryKey: ["news", category],
        queryFn: () => api.getNews(category),
    });
}

export function useBasicFinancials(ticker: Ticker) {
    return useQuery({
        queryKey: ["financials", ticker.symbol],
        queryFn: () => api.getFinancials(ticker),
    });
}
