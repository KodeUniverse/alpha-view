import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api/client";

import { Frequency, Ticker, NewsCategory } from "@/types";

export function useGetWatchLists() {
  return useQuery({
    queryKey: ["getWatchLists"],
    queryFn: () => api.getWatchLists(),
  });
}
export function useCreateWatchList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listName }: { listName: string }) =>
      api.createWatchList(listName),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["getWatchLists"] }),
  });
}
export function useDeleteWatchList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listId }: { listId: number }) => api.deleteWatchList(listId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["getWatchLists"],
      }),
  });
}
export function useRenameWatchList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      listId,
      listName,
    }: {
      listId: number;
      listName: string;
    }) => api.renameWatchList(listId, listName),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["getWatchLists"] }),
  });
}
export function useGetWatchListItems(listId: number | null) {
  return useQuery({
    queryKey: ["getWatchListItems", listId],
    queryFn: () => api.getWatchListItems(listId!),
    enabled: listId != null,
  });
}

export function useAddToWatchList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticker, listId }: { ticker: Ticker; listId: number }) =>
      api.addToWatchList(ticker, listId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["getWatchListItems"] }),
  });
}

export function useRemoveFromWatchList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticker, listId }: { ticker: Ticker; listId: number }) =>
      api.removeFromWatchList(ticker, listId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["getWatchListItems"] });
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

export function useMarketClock() {
  return useQuery({
    queryKey: ["marketClock"],
    queryFn: () => api.getMarketClock(),
    // The clock only changes at session boundaries, so there is nothing to gain from
    // polling faster than a minute.
    refetchInterval: 60_000,
  });
}

export function useFeedHealth() {
  return useQuery({
    queryKey: ["feedHealth"],
    queryFn: () => api.getFeedHealth(),
    refetchInterval: 20_000,
    // A 503 here means the backend is reporting itself degraded, which is the answer we
    // wanted, not a transport failure worth retrying. Refetching still runs on the interval,
    // so the indicator recovers on its own once the feed does.
    retry: false,
  });
}
