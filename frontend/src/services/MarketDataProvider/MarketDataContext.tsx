import { useContext, createContext, useRef, ReactNode } from "react";
import { AlpacaProvider, FinnhubProvider } from "./providers";
import { MarketDataProvider } from "./MarketDataProvider";

const AlpacaDataContext = createContext<MarketDataProvider | null>(null);
const FinnhubDataContext = createContext<MarketDataProvider | null>(null);

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

export function FinnhubDataContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const provider = useRef<MarketDataProvider | null>(null);

  if (!provider.current) provider.current = new FinnhubProvider();

  return (
    <FinnhubDataContext.Provider value={provider.current}>
      {children}
    </FinnhubDataContext.Provider>
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

export function useFinnhubDataProvider() {
  const ctx = useContext(FinnhubDataContext);

  if (!ctx) {
    throw new Error(
      "useFinnhubDataProvider must be used inside FinnhubDataProvider context",
    );
  }
  return ctx;
}
