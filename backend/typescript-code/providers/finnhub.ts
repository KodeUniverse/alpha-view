import { Ticker, NewsArticle, StockBasicFinancials } from "@shared/types";

const BASE_URL = "https://finnhub.io/api/v1";

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
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: unknown;
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
    peTTM?: number;
    pegTTM?: number;
    psTTM?: number;
    quickRatioAnnual?: number;
    quickRatioQuarterly?: number;
    revenueGrowthTTMYoy?: number;
    revenuePerShareAnnual?: number;
    roeRfy?: number;
    "totalDebt/totalEquityAnnual"?: number;
  };
}

function transformMetrics(m: FinnhubMetricResponse["metric"]): StockBasicFinancials {
  return {
    peTTM: m.peTTM,
    forwardPE: m.forwardPE,
    pb: m.pb,
    priceToSalesTTM: m.psTTM,
    pegTTM: m.pegTTM,
    evToEBITDA: m.evEbitdaTTM,
    evToRevenue: m.evRevenueTTM,
    marketCap: m.marketCapitalization,
    enterpriseValue: m.enterpriseValue,
    epsTTM: m.epsTTM,
    roe: m.roeRfy,
    netProfitMargin: m.netProfitMarginAnnual,
    grossMargin: m.grossMarginAnnual,
    operatingMargin: m.operatingMarginAnnual,
    revenueGrowth: m.revenueGrowthTTMYoy,
    epsGrowth: m.epsGrowthTTMYoy,
    debtToEquity: m["totalDebt/totalEquityAnnual"],
    currentRatio: m.currentRatioAnnual,
    quickRatio: m.quickRatioAnnual,
    interestCoverage: m.netInterestCoverageAnnual,
    bookValue: m.bookValuePerShareAnnual,
    revenuePerShare: m.revenuePerShareAnnual,
    dividendPerShare: m.dividendPerShareAnnual,
    divYieldTTM: m.currentDividendYieldTTM,
    payoutRatio: m.payoutRatioAnnual,
    yearHigh: m["52WeekHigh"],
    yearLow: m["52WeekLow"],
    adtv10Day: m["10DayAverageTradingVolume"],
    beta: m.beta,
  };
}

export async function getMarketNews(
  category: FinnhubNewsCategory,
): Promise<NewsArticle[]> {
  const url = new URL(`${BASE_URL}/news`);
  url.searchParams.set("category", category);
  url.searchParams.set("token", process.env.FINNHUB_API_KEY!);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: Failed to fetch market news.`);
  }

  const data = (await res.json()) as FinnhubNewsArticle[];
  return data.map((article) => ({
    ...article,
    datetime: new Date(article.datetime * 1000),
  }));
}

export async function getBasicFinancials(
  ticker: Ticker,
): Promise<StockBasicFinancials | undefined> {
  const url = new URL(`${BASE_URL}/stock/metric`);
  url.searchParams.set("token", process.env.FINNHUB_API_KEY!);
  url.searchParams.set("symbol", ticker.symbol);
  url.searchParams.set("metric", "all");

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: Failed to fetch financials for ${ticker.symbol}.`);
  }

  const data = (await res.json()) as FinnhubMetricResponse;
  return transformMetrics(data.metric);
}
