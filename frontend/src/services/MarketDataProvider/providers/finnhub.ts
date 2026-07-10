import { MarketDataProvider } from "../MarketDataProvider";
import { Ticker, NewsArticle } from "@shared/types";

type FinnhubNewsCategory =
  | "general"
  | "forex"
  | "crypto"
  | "merger"
  | "technology"
  | "business"
  | "top news";

interface FinnhubNewsArticle {
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

export class FinnhubProvider implements MarketDataProvider {
  private readonly apiKey: string = import.meta.env.FINNHUB_API_KEY;
  private readonly apiSecret: string = import.meta.env.FINNHUB_API_SECRET;
  private readonly apiURL: URL = new URL("https://finnhub.io/api/v1");

  async getMarketNews(category: FinnhubNewsCategory): Promise<NewsArticle[]> {
    const endpoint = new URL(this.apiURL + "/news");
    endpoint.searchParams.set("category", category);
    endpoint.searchParams.set("token", this.apiKey);
    try {
      const res = await fetch(endpoint);
      if (res.ok) {
        const data: FinnhubNewsArticle[] = await res.json();

        const transformed: NewsArticle[] = data.map((article) => {
          return { ...article, datetime: new Date(article.datetime * 1000) };
        });

        return transformed;
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
