import { useContext, createContext, useRef, ReactNode } from "react";
import MarketDataProvider from "./MarketDataProvider";
import AlpacaProvider from "./providers";

function createMarketDataProvider(): MarketDataProvider {
  let provider: MarketDataProvider;
  switch (import.meta.env.DATA_PROVIDER) {
    case "alpaca":
      provider = new AlpacaProvider();
      break;
  }
  return provider;
}

const MarketDataContext = createContext<MarketDataProvider | null>(null);

export function MarketDataProviderRoot({ children }: { children: ReactNode }) {
  const provider = useRef<MarketDataProvider>(null);
  if (!provider) {
    provider.current = createMarketDataProvider();
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
