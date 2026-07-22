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
    beta?: number;
    bookValuePerShareAnnual?: number;
    cashFlowPerShareAnnual?: number;
    currentDividendYieldTTM?: number;
    currentRatioAnnual?: number;
    currentRatioQuarterly?: number;
    dividendPerShareAnnual?: number;
    dividendYieldIndicatedAnnual?: number;
    enterpriseValue?: number;
    epsAnnual?: number;
    epsGrowthTTMYoy?: number;
    epsTTM?: number;
    evEbitdaTTM?: number;
    evRevenueTTM?: number;
    forwardPE?: number;
    forwardPEG?: number;
    grossMarginAnnual?: number;
    "longTermDebt/equityAnnual"?: number;
    marketCapitalization?: number;
    netInterestCoverageAnnual?: number;
    netProfitMarginAnnual?: number;
    operatingMarginAnnual?: number;
    payoutRatioAnnual?: number;
    pb?: number;
    peAnnual?: number;
    peTTM?: number;
    pegTTM?: number;
    psTTM?: number;
    quickRatioAnnual?: number;
    quickRatioQuarterly?: number;
    revenueGrowthTTMYoy?: number;
    revenuePerShareAnnual?: number;
    roaRfy?: number;
    roiAnnual?: number;
    roeRfy?: number;
    "totalDebt/totalEquityAnnual"?: number;
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

    endpoint.searchParams.set("token", this.apiKey);
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
      peTTM: m.peTTM,
      peAnnual: m.peAnnual,
      forwardPE: m.forwardPE,
      pb: m.pb,
      priceToSalesTTM: m.psTTM,
      pegTTM: m.pegTTM,
      evToEBITDA: m.evEbitdaTTM,
      evToRevenue: m.evRevenueTTM,
      enterpriseValue: m.enterpriseValue,

      // Earnings
      epsTTM: m.epsTTM,
      epsAnnual: m.epsAnnual,
      // forwardEps: not available in Finnhub metric response

      // Profitability
      roe: m.roeRfy,
      roa: m.roaRfy,
      roic: m.roiAnnual,
      netProfitMargin: m.netProfitMarginAnnual,
      grossMargin: m.grossMarginAnnual,
      operatingMargin: m.operatingMarginAnnual,

      // Growth
      revenueGrowth: m.revenueGrowthTTMYoy,
      epsGrowth: m.epsGrowthTTMYoy,

      // Cash Flow
      // freeCashFlow: only per-share values available (cashFlowPerShareAnnual, pfcfShareAnnual)
      // operatingCashFlow: only per-share values available

      // Financial Health
      debtToEquity: m["totalDebt/totalEquityAnnual"],
      // totalDebt: not available in metric response
      // totalCash: not available in metric response
      // netDebt: requires totalDebt and totalCash
      currentRatio: m.currentRatioAnnual,
      quickRatio: m.quickRatioAnnual,
      interestCoverage: m.netInterestCoverageAnnual,

      // Per Share
      bookValue: m.bookValuePerShareAnnual,
      revenuePerShare: m.revenuePerShareAnnual,
      dividendPerShare: m.dividendPerShareAnnual,

      // Dividends
      divYieldTTM: m.currentDividendYieldTTM,
      payoutRatio: m.payoutRatioAnnual,

      // Market
      marketCap: m.marketCapitalization,
      yearHigh: m["52WeekHigh"],
      yearLow: m["52WeekLow"],

      // Volume
      adtv10Day: m["10DayAverageTradingVolume"],

      // Risk
      beta: m.beta,
    };
  }
}
