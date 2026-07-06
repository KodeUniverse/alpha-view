import { ProviderQueryResponse, useProviderQuery } from "./useProviderQuery";
import { Ticker } from "@shared/types";

export function useSymbolList(): ProviderQueryResponse<Ticker[]> {
  return useProviderQuery([], (provider) => provider.getSymbolList());
}
