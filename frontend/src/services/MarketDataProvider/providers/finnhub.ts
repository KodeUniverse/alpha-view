import { MarketDataProvider } from "../MarketDataProvider";
import { Ticker } from "@shared/types";

type FinnhubNewsCategory =
  | "general"
  | "forex"
  | "crypto"
  | "merger"
  | "technology"
  | "business"
  | "top news";

interface FinnhubNewsResponse {
  category: FinnhubNewsCategory;
  datetime: number; // unix timestamp
  headline: string;
  id: number;
  image: string;
  related: unknown; // string? or JSON/array? not sure
  source: string;
  summary: string;
  url: string;
}

export default class FinnhubProvider implements MarketDataProvider {
  private readonly apiKey: string = import.meta.env.FINNHUB_API_KEY;
  private readonly apiSecret: string = import.meta.env.FINNHUB_API_SECRET;
  private readonly apiURL: URL = new URL("https://finnhub.io/api/v1");

  async getMarketNews(
    category: FinnhubNewsCategory,
  ): Promise<FinnhubNewsResponse> {
    const endpoint = new URL(this.apiURL + "/news");
    endpoint.searchParams.set("category", category);
    try {
      const res = await fetch(endpoint, {
        headers: {
          "X-Finnhub-Token": this.apiKey,
        },
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      } else {
        throw new Error(
          `HTTP ${res.status}: Failed to fetch Finnhub market news.`,
        );
      }
    } catch (error) {
      console.log(error);
    }
  }
  async getBasicFinancials(ticker: Ticker) {
    const endpoint = new URL(this.apiURL + "/stock/metric");

    endpoint.searchParams.set("symbol", ticker.symbol);
    endpoint.searchParams.set("metric", "all");

    try {
      const res = await fetch(endpoint);

      if (res.ok) {
        const data = await res.json();
        return data;
      } else {
        throw new Error(
          `HTTP ${res.status}: Failed to fetch Finnhub fundamental data for ticker ${ticker.symbol}`,
        );
      }
    } catch (error) {
      console.log(error);
    }
  }
}
