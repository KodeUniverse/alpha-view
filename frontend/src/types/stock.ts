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
  // Stamped by the socket handler on arrival, never sent by the backend -- which is why it
  // is optional and why the REST responses still parse. Alpaca's `time` carries an
  // exchange-local offset, so measuring how long ago a bar arrived against it would fold the
  // viewer's timezone and clock skew into the result. Receipt time answers "is data still
  // coming in" directly.
  receivedAt: z.number().optional(),
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

// The backend persists watchlist columns in PascalCase (see
// backend/app/database/watchlist.py), so the wire format is `Id`/`ListName`. Validate the
// shape we actually receive, then transform to the camelCase shape the app consumes --
// `z.infer` still yields `{ id, listName }`, so call sites are unaffected.
export const WatchListSchema = z
  .object({ Id: z.number(), ListName: z.string() })
  .transform((v) => ({ id: v.Id, listName: v.ListName }));

// `Name` is `str | None` on the backend (WatchlistItemResponse), hence .nullable().
export const WatchListTickerSchema = z
  .object({
    Id: z.number(),
    ListId: z.number(),
    Ticker: z.string(),
    Name: z.string().nullable(),
    SortId: z.number(),
  })
  .transform((v) => ({
    id: v.Id,
    listId: v.ListId,
    ticker: v.Ticker,
    name: v.Name,
    sortId: v.SortId,
  }));

export const LiveTickerFeedMessageSchema = z.object({
  dailyBar: OHLCVDataSchema.nullable(),
  minuteBar: OHLCVDataSchema.nullable(),
});

// Alpaca's trading clock. snake_case on the wire, camelCase in the app -- same shape as the
// watchlist schemas' transform.
export const MarketClockSchema = z
  .object({
    is_open: z.boolean(),
    next_open: z.coerce.date(),
    next_close: z.coerce.date(),
  })
  .transform((v) => ({
    isOpen: v.is_open,
    nextOpen: v.next_open,
    nextClose: v.next_close,
  }));

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
export type MarketClock = z.infer<typeof MarketClockSchema>;
export type OHLCVData = z.infer<typeof OHLCVDataSchema>;
export type OHLCData = z.infer<typeof OHLCDataSchema>;
export type PriceData = z.infer<typeof PriceDataSchema>;
export type VolumeData = z.infer<typeof VolumeDataSchema>;
export type Ticker = z.infer<typeof TickerSchema>;
export type LiveTickerFeedMessage = z.infer<typeof LiveTickerFeedMessageSchema>;
export type StockBasicFinancials = z.infer<typeof StockBasicFinancialsSchema>;
export type WatchList = z.infer<typeof WatchListSchema>;
export type WatchListTicker = z.infer<typeof WatchListTickerSchema>;
