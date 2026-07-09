import { useContext, createContext, useRef, ReactNode } from "react";
import AlpacaProvider from "./providers";
import {
  MarketDataProvider,
  MarketDataProviderName,
} from "./MarketDataProvider";
function createMarketDataProvider(
  providerName: MarketDataProviderName,
): MarketDataProvider {
  let provider: MarketDataProvider;
  switch (providerName) {
    case "alpaca":
      provider = new AlpacaProvider();
      break;
    case "finnhub":
      provider = new FinnhubProvider();
      break;
    default:
      throw new Error(`providerName ${providerName} does not exist.`);
  }
  return provider;
}

const MarketDataContext = createContext<MarketDataProvider | null>(null);

export function MarketDataProviderRoot({
  providerName,
  children,
}: {
  providerName: MarketDataProviderName;
  children: ReactNode;
}) {
  const provider = useRef<MarketDataProvider>(null);
  if (!provider.current) {
    provider.current = createMarketDataProvider(providerName);
  }
  return (
    <MarketDataContext.Provider value={provider.current}>
      {children}
    </MarketDataContext.Provider>
  );
}

export function useMarketDataProvider() {
  const ctx = useContext(MarketDataContext);
  if (!ctx) {
    throw new Error(
      "useMarketDataProvider() hook must be used within MarketDataProviderRoot.",
    );
  }
  return ctx;
}
