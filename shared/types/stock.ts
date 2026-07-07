export interface OHLCVData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OHLCData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface PriceData {
  value: string;
  time: string;
}

export interface VolumeData {
  value: number;
  time: string;
  color: string;
}
export interface Ticker {
  symbol: string;
  name: string;
  exchange?: string;
}

export type Frequency = "intraday" | "daily" | "weekly" | "monthly";
