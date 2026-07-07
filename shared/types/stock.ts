export interface OHLCVData {
  time: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
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

export type Frequency = "intraday" | "daily" | "weekly" | "monthly";
