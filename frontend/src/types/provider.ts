import { z } from "zod";

//====================================================================================================
//                                                 ZOD SCHEMAS
//====================================================================================================

export const MarketDataProviderNameSchema = z.enum(["alpaca", "finnhub"]);

// Shape of the backend's GET /health. Lives with the provider types because it describes the
// market data pipeline, not stock prices.
//
// z.enum rather than z.string on `status` on purpose: if the backend ever renames
// "degraded", a parse failure is loud, whereas a plain string would fail the
// `=== "degraded"` comparison silently and report a sick feed as healthy.
export const FeedHealthSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  stream: z.enum(["idle", "running", "exited"]),
  dispatcher: z.enum(["running", "exited"]),
  tickers: z.number(),
  sessions: z.number(),
});

//====================================================================================================
//                                                 TYPES
//====================================================================================================

export type MarketDataProviderName = z.infer<typeof MarketDataProviderNameSchema>;
export type FeedHealth = z.infer<typeof FeedHealthSchema>;