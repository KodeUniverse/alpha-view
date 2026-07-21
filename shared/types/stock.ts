export interface OHLCVData {
  time: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  symbol?: string;
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

export interface StockBasicFinancials {
  // TODO: finish adding and reviewing fields.
  adtv10Day?: number;
  yearHigh?: number;
  yearLow?: number;
  beta?: number;
  evToFCFAnnual?: number;
  evToFCFTTM?: number;
  divYieldTTM?: number;
  currentRatioAnnual?: number;
  currentRatioQuarterly?: number;
  enterpriseValue?: number;
  epsAnnual?: number;
  epsTTM?: number;
  evToEBITDA?: number;
  evToRevenue?: number;
  forwardPE?: number;
  forwardPEG?: number;
  peAnnual?: number;
  peTTM?: number;
  pegTTM?: number;
  pb?: number; // price/book value
}

export type Frequency = "intraday" | "daily" | "weekly" | "monthly";
