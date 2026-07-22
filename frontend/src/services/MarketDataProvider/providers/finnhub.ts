import { MarketDataProvider } from "../MarketDataProvider";
import { Ticker, NewsArticle, StockBasicFinancials } from "@shared/types";

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

interface FinnhubMetricResponse {
  symbol: string;
  metric: {
    "10DayAverageTradingVolume"?: number;
    "52WeekHigh"?: number;
    "52WeekLow"?: number;
    BasicEPS?: number;
    Beta?: number;
    BookValue?: number;
    CurrentRatio?: number;
    DilutedEpsTTM?: number;
    DividendPerShare?: number;
    DividendYield?: number;
    EnterpriseValue?: number;
    EvToEbitda?: number;
    EvToRevenue?: number;
    ForwardEps?: number;
    FreeCashFlow?: number;
    GrossMargin?: number;
    InterestCoverage?: number;
    LongTermDebtToEquity?: number;
    NetIncomeGrowth?: number;
    NetProfitMargin?: number;
    OperatingCashFlow?: number;
    OperatingMargin?: number;
    OutstandingShares?: number;
    PayoutRatio?: number;
    PeRatio?: number;
    PeRatioTTM?: number;
    PriceToBook?: number;
    PriceToSalesTTM?: number;
    QuickRatio?: number;
    ROA?: number;
    ROE?: number;
    ROIC?: number;
    RevenueGrowth?: number;
    RevenuePerShare?: number;
    TotalCash?: number;
    TotalDebt?: number;
    TotalDebtToEquity?: number;
    TrailingEps?: number;
  };
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
      return [];
    }
  }
  async getBasicFinancials(
    ticker: Ticker,
  ): Promise<StockBasicFinancials | undefined> {
    const endpoint = new URL(this.apiURL + "/stock/metric");

    endpoint.searchParams.set("symbol", ticker.symbol);
    endpoint.searchParams.set("metric", "all");

    try {
      const res = await fetch(endpoint);

      if (res.ok) {
        const data: FinnhubMetricResponse = await res.json();
        return this.transformMetrics(data.metric);
      } else {
        throw new Error(
          `HTTP ${res.status}: Failed to fetch Finnhub fundamental data for ticker ${ticker.symbol}`,
        );
      }
    } catch (error) {
      console.log(error);
      return undefined;
    }
  }

  private transformMetrics(
    m: FinnhubMetricResponse["metric"],
  ): StockBasicFinancials {
    return {
      // Valuation
      peTTM: m.PeRatioTTM,
      peAnnual: m.PeRatio,
      pb: m.PriceToBook,
      priceToSalesTTM: m.PriceToSalesTTM,
      evToEBITDA: m.EvToEbitda,
      evToRevenue: m.EvToRevenue,
      enterpriseValue: m.EnterpriseValue,

      // Earnings
      epsTTM: m.TrailingEps,
      epsAnnual: m.BasicEPS,
      forwardEps: m.ForwardEps,

      // Profitability
      roe: m.ROE,
      roa: m.ROA,
      roic: m.ROIC,
      netProfitMargin: m.NetProfitMargin,
      grossMargin: m.GrossMargin,
      operatingMargin: m.OperatingMargin,

      // Growth
      revenueGrowth: m.RevenueGrowth,
      epsGrowth: m.NetIncomeGrowth,

      // Cash Flow
      freeCashFlow: m.FreeCashFlow,
      operatingCashFlow: m.OperatingCashFlow,

      // Financial Health
      debtToEquity: m.TotalDebtToEquity,
      totalDebt: m.TotalDebt,
      totalCash: m.TotalCash,
      netDebt:
        m.TotalDebt != null && m.TotalCash != null
          ? m.TotalDebt - m.TotalCash
          : undefined,
      currentRatio: m.CurrentRatio,
      quickRatio: m.QuickRatio,
      interestCoverage: m.InterestCoverage,

      // Per Share
      bookValue: m.BookValue,
      revenuePerShare: m.RevenuePerShare,
      dividendPerShare: m.DividendPerShare,

      // Dividends
      divYieldTTM: m.DividendYield,
      payoutRatio: m.PayoutRatio,

      // Market
      sharesOutstanding: m.OutstandingShares,
      yearHigh: m["52WeekHigh"],
      yearLow: m["52WeekLow"],

      // Volume
      adtv10Day: m["10DayAverageTradingVolume"],

      // Risk
      beta: m.Beta,
    };
  }
}
