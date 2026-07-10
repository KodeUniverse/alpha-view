import {
  useAlpacaDataProvider,
  useFinnhubDataProvider,
} from "@/services/MarketDataProvider/MarketDataContext";
import { MarketDataProviderName } from "@shared/types";
import { MarketDataProvider } from "@/services/MarketDataProvider/MarketDataProvider";
import { useState, useEffect } from "react";

export interface ProviderQueryResponse<T> {
  data: T;
  isLoading: boolean;
  error: Error | null;
  isError: boolean;
}
export function useProviderQuery<T>(
  deps: unknown[],
  queryFn: (provider: MarketDataProvider) => Promise<T>,
  sourceProvider: MarketDataProviderName,
): ProviderQueryResponse<T> {
  let provider: MarketDataProvider;
  switch (sourceProvider) {
    case "alpaca":
      provider = useAlpacaDataProvider();
      break;
    case "finnhub":
      provider = useFinnhubDataProvider();
      break;
  }

  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [queryData, setQueryData] = useState<T | null>(null);

  useEffect(() => {
    let cancelled = false;

    setError(null);
    setLoading(true);

    queryFn(provider)
      .then((data) => {
        if (!cancelled) setQueryData(data);
      })
      .catch((error) => {
        if (!cancelled) setError(error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, deps);
  return { data: queryData, isLoading, error, isError: !!error };
}
