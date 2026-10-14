import { z } from "zod";

//====================================================================================================
//                                                 ZOD SCHEMAS
//====================================================================================================

export const FrequencySchema = z.enum([
  "intraday",
  "daily",
  "weekly",
  "monthly",
]);

export const OHLCVDataSchema = z.object({
  time: z.coerce.date(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
  symbol: z.string().optional(),
  frequency: FrequencySchema.optional(),
});

export const OHLCDataSchema = z.object({
  time: z.coerce.date(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
});

export const PriceDataSchema = z.object({
  value: z.number(),
  time: z.coerce.date(),
});

export const VolumeDataSchema = z.object({
  value: z.number(),
  time: z.coerce.date(),
  color: z.string(),
});

export const TickerSchema = z.object({
  symbol: z.string(),
  name: z.string().optional(),
  exchange: z.string().optional(),
});

export const WatchListSchema = z.object({
  id: z.number(),
  listName: z.string(),
});

export const WatchListTickerSchema = z.object({
  id: z.number(),
  listId: z.number(),
  ticker: z.string(),
  name: z.string(),
  sortId: z.number(),
});

export const LiveTickerFeedMessageSchema = z.object({
  dailyBar: OHLCVDataSchema.nullable(),
  minuteBar: OHLCVDataSchema.nullable(),
});

export const StockBasicFinancialsSchema = z.object({
  // Valuation
  peTTM: z.number().optional(),
  forwardPE: z.number().optional(),
  pb: z.number().optional(),
  priceToSalesTTM: z.number().optional(),
  pegTTM: z.number().optional(),
  evToEBITDA: z.number().optional(),
  evToRevenue: z.number().optional(),
  marketCap: z.number().optional(),
  enterpriseValue: z.number().optional(),

  // Earnings
  epsTTM: z.number().optional(),
  forwardEps: z.number().optional(), // not available in Finnhub metric response

  // Profitability
  roe: z.number().optional(),
  netProfitMargin: z.number().optional(),
  grossMargin: z.number().optional(),
  operatingMargin: z.number().optional(),

  // Growth
  revenueGrowth: z.number().optional(),
  epsGrowth: z.number().optional(),

  // Financial Health
  debtToEquity: z.number().optional(),
  totalDebt: z.number().optional(), // not available in Finnhub metric response
  totalCash: z.number().optional(), // not available in Finnhub metric response
  netDebt: z.number().optional(), // requires totalDebt and totalCash
  currentRatio: z.number().optional(),
  quickRatio: z.number().optional(),
  interestCoverage: z.number().optional(),

  // Per Share
  bookValue: z.number().optional(),
  revenuePerShare: z.number().optional(),
  dividendPerShare: z.number().optional(),

  // Dividends
  divYieldTTM: z.number().optional(),
  payoutRatio: z.number().optional(),

  // Cash Flow
  freeCashFlow: z.number().optional(), // Finnhub only provides per-share values
  operatingCashFlow: z.number().optional(), // Finnhub only provides per-share values

  // Market
  sharesOutstanding: z.number().optional(), // not available in Finnhub metric response
  yearHigh: z.number().optional(),
  yearLow: z.number().optional(),

  // Volume
  adtv10Day: z.number().optional(),

  // Risk
  beta: z.number().optional(),
});

//====================================================================================================
//                                                 TYPES
//====================================================================================================

export type Frequency = z.infer<typeof FrequencySchema>;
export type OHLCVData = z.infer<typeof OHLCVDataSchema>;
export type OHLCData = z.infer<typeof OHLCDataSchema>;
export type PriceData = z.infer<typeof PriceDataSchema>;
export type VolumeData = z.infer<typeof VolumeDataSchema>;
export type Ticker = z.infer<typeof TickerSchema>;
export type LiveTickerFeedMessage = z.infer<typeof LiveTickerFeedMessageSchema>;
export type StockBasicFinancials = z.infer<typeof StockBasicFinancialsSchema>;
export type WatchList = z.infer<typeof WatchListSchema>;
export type WatchListTicker = z.infer<typeof WatchListTickerSchema>;
