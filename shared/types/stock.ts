export interface OHLCVData {
  time: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  symbol?: string;
  frequency?: Frequency;
}

export interface OHLCData {
  time: Date;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface PriceData {
  value: number;
  time: Date;
}

export interface VolumeData {
  value: number;
  time: Date;
  color: string;
}
export interface Ticker {
  symbol: string;
  name?: string;
  exchange?: string;
}

export interface LiveTickerFeedMessage {
  dailyBar: OHLCVData | null;
  minuteBar: OHLCVData | null;
}

export interface StockBasicFinancials {
  // Valuation
  peTTM?: number;
  peAnnual?: number;
  forwardPE?: number;
  pb?: number;
  priceToSalesTTM?: number;
  pegTTM?: number;
  evToEBITDA?: number;
  evToRevenue?: number;
  enterpriseValue?: number;

  // Earnings
  epsTTM?: number;
  epsAnnual?: number;
  forwardEps?: number;

  // Profitability
  roe?: number;
  roa?: number;
  roic?: number;
  netProfitMargin?: number;
  grossMargin?: number;
  operatingMargin?: number;

  // Growth
  revenueGrowth?: number;
  epsGrowth?: number;

  // Cash Flow
  freeCashFlow?: number;
  operatingCashFlow?: number;

  // Financial Health
  debtToEquity?: number;
  totalDebt?: number;
  totalCash?: number;
  netDebt?: number;
  currentRatio?: number;
  quickRatio?: number;
  interestCoverage?: number;

  // Per Share
  bookValue?: number;
  revenuePerShare?: number;
  dividendPerShare?: number;

  // Dividends
  divYieldTTM?: number;
  payoutRatio?: number;

  // Market
  marketCap?: number;
  sharesOutstanding?: number;
  yearHigh?: number;
  yearLow?: number;

  // Volume
  adtv10Day?: number;

  // Risk
  beta?: number;
}

export type Frequency = "intraday" | "daily" | "weekly" | "monthly";
