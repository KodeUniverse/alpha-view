import { Ticker, OHLCVData, Frequency } from "@shared/types";

type AlpacaMessage = AlpacaAuthMessage | AlpacaBarMessage;

interface AlpacaAuthMessage {
  T: "success" | "error";
  msg: string;
}

interface AlpacaBarMessage {
  T: "b" | "d";
  S: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  vw: number;
  n: number;
  t: string;
}

interface AlpacaAsset {
  name: string;
  symbol: string;
  class: "us_equity" | "us_option" | "crypto" | "ipo";
  exchange: "AMEX" | "ARCA" | "BATS" | "NYSE" | "NASDAQ" | "NYSEARCA" | "OTC";
  tradeable: boolean;
  marginable: boolean;
  shortable: boolean;
  status: "active" | "inactive";
  fractionable: boolean;
  id: string;
}

interface AlpacaHistBar {
  c: number;
  h: number;
  l: number;
  n: number;
  o: number;
  t: string;
  v: number;
  vw: number;
}

interface AlpacaHistBarsResponse {
  bars: Record<string, AlpacaHistBar[]>;
  next_page_token: string | null;
}

const REST_BASE = "https://paper-api.alpaca.markets";
const DATA_BASE = "https://data.alpaca.markets";

function alpacaHeaders() {
  if (!process.env.ALPACA_API_SECRET || !process.env.ALPACA_API_KEY)
    throw new Error("Alpaca API key/secret is undefined.");
  return {
    "APCA-API-KEY-ID": process.env.ALPACA_API_KEY,
    "APCA-API-SECRET-KEY": process.env.ALPACA_API_SECRET,
  };
}

export async function getSymbolList(): Promise<Ticker[]> {
  const url = new URL(`${REST_BASE}/v2/assets`);
  url.searchParams.set("status", "active");
  url.searchParams.set("asset_class", "us_equity");

  const res = await fetch(url, { headers: alpacaHeaders() });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: Failed to fetch symbol list.`);
  }

  const data = (await res.json()) as AlpacaAsset[];
  return data.map((a) => ({
    symbol: a.symbol,
    name: a.name,
    exchange: a.exchange,
  }));
}

const FREQ_MAP: Record<Frequency, string> = {
  intraday: "1T",
  daily: "1D",
  weekly: "1W",
  monthly: "1M",
};

export async function getBars(
  tickers: Ticker[],
  freq: Frequency,
  start: Date,
  end: Date,
): Promise<Record<string, OHLCVData[]>> {
  const url = new URL(`${DATA_BASE}/v2/stocks/bars`);
  url.searchParams.set("symbols", tickers.map((t) => t.symbol).join(","));
  url.searchParams.set("timeframe", FREQ_MAP[freq]);
  url.searchParams.set("start", start.toISOString());
  url.searchParams.set("end", end.toISOString());
  url.searchParams.set("adjustment", "split");
  url.searchParams.set("feed", "iex");

  let pageCount = 0;
  const MAX_PAGES = 50;
  let next_page_token: string | null = null;
  const responses: AlpacaHistBarsResponse[] = [];
  let isFirstPage = true;

  while ((next_page_token || isFirstPage) && pageCount < MAX_PAGES) {
    pageCount++;
    isFirstPage = false;

    if (next_page_token) {
      url.searchParams.set("page_token", next_page_token);
    }

    const res = await fetch(url, { headers: alpacaHeaders() });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: Failed to fetch bars from Alpaca.`);
    }
    const data = (await res.json()) as AlpacaHistBarsResponse;
    responses.push(data);
    next_page_token = data.next_page_token ?? null;
  }

  const symbolBars: Record<string, OHLCVData[]> = {};
  for (const res of responses) {
    for (const symbol of Object.keys(res.bars)) {
      const bars: OHLCVData[] = res.bars[symbol].map((bar) => ({
        open: bar.o,
        low: bar.l,
        high: bar.h,
        close: bar.c,
        volume: bar.v,
        time: new Date(bar.t),
      }));
      symbolBars[symbol] = (symbolBars[symbol] ?? []).concat(bars);
    }
  }
  return symbolBars;
}

export async function getBarsForTicker(
  ticker: Ticker,
  freq: Frequency,
  start: Date,
  end: Date,
): Promise<OHLCVData[]> {
  const bars = await getBars([ticker], freq, start, end);
  return bars[ticker.symbol] ?? [];
}
