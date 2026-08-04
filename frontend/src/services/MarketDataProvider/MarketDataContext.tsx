import { useContext, createContext, useRef, ReactNode } from "react";
import { AlpacaProvider } from "./providers";
import { MarketDataProvider } from "./MarketDataProvider";

const AlpacaDataContext = createContext<MarketDataProvider | null>(null);

export function AlpacaDataContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const provider = useRef<MarketDataProvider | null>(null);

  if (!provider.current) provider.current = new AlpacaProvider();

  return (
    <AlpacaDataContext.Provider value={provider.current}>
      {children}
    </AlpacaDataContext.Provider>
  );
}

export function useAlpacaDataProvider() {
  const ctx = useContext(AlpacaDataContext);

  if (!ctx) {
    throw new Error(
      "useAlpacaDataProvider must be used inside AlpacaDataProvider context.",
    );
  }
  return ctx;
}
