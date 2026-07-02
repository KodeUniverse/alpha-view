import { useMarketDataProvider } from "@/services/MarketDataProvider/MarketDataContext";
import MarketDataProvider from "@/services/MarketDataProvider/MarketDataProvider";
import { useState, useEffect } from "react";

export default function useProviderQuery<T>(
  deps: unknown[],
  queryFn: (provider: MarketDataProvider) => Promise<T>,
) {
  const provider = useMarketDataProvider();
  const [isLoading, setLoading] = useState(false);
  const [isError, setError] = useState(false);
  const [queryData, setQueryData] = useState(null);

  useEffect(() => {
    let cancelled = false;

    setError(false);
    setLoading(true);

    queryFn(provider)
      .then((data) => {
        if (!cancelled) setQueryData(data);
      })
      .catch((error) => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, deps);
  return { queryData, isLoading, isError };
}
