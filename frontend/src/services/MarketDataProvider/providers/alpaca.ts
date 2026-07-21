import { MarketDataProvider } from "../MarketDataProvider.ts";
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
  id: string; // UUID string
  margin_requirement_long?: string;
  margin_requirement_short?: string;
  min_order_size?: string;
  min_trade_increment?: string;
  price_increment?: string;
  attributes?: string[];
  borrow_status?: "easy_to_borrow" | "hard_to_borrow";
  cusip?: string | null;
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

export class AlpacaProvider implements MarketDataProvider {
  private socket?: WebSocket;
  private readonly apiKey: string = import.meta.env.ALPACA_API_KEY;
  private readonly apiSecret: string = import.meta.env.ALPACA_API_SECRET;
  private intentionalClose: boolean = false;

  startLiveTickerFeed(tickers: Ticker[], onTick: (data: OHLCVData) => void) {
    this.stopLiveTickerFeed();

    this.intentionalClose = false;

    const version = "v2";
    const feed = "iex";

    this.socket = new WebSocket(
      `wss://stream.data.alpaca.markets/${version}/${feed}`,
    );
    this.socket.addEventListener("open", (event) => {
      console.log("Alpaca WebSocket connected.");
      // Authenticate
      this.socket!.send(
        JSON.stringify({
          action: "auth",
          key: import.meta.env.ALPACA_API_KEY,
          secret: import.meta.env.ALPACA_API_SECRET,
        }),
      );
    });
    this.socket.addEventListener("close", (event) => {
      if (this.intentionalClose) return;
      console.log(
        "Alpaca WebSocket disconnected, reconnecting in 2 seconds...",
      );
      setTimeout(() => this.startLiveTickerFeed(tickers, onTick), 2000);
    });
    this.socket.addEventListener("error", (error) => {
      console.error(`Alpaca WebSocket Error: ${error}`); // TODO: this error object is an Event instance, so doesnt log correctly.
    });
    this.socket.addEventListener("message", (msg) => {
      let messages: AlpacaMessage[];
      try {
        messages = JSON.parse(msg.data);
      } catch (error) {
        console.error(`Malformed message from Alpaca WebSocket: ${msg.data}`);
        return;
      }
      // check for authentication reply message
      for (const data of messages as AlpacaMessage[]) {
        console.log(`Type of Alpaca WebSocket message recieved: ${data.T}`);
        if (data.T === "success" && data.msg === "authenticated") {
          console.log("Alpaca WebSocket Authenticated.");
          this.socket!.send(
            JSON.stringify({
              action: "subscribe",
              bars: tickers.map((ticker) => ticker.symbol),
              dailyBars: tickers.map((ticker) => ticker.symbol),
            }),
          );
        } else if (data.T === "b" || data.T === "d") {
          const transformData: OHLCVData = {
            open: data.o,
            close: data.c,
            high: data.h,
            low: data.l,
            volume: data.v,
            time: new Date(data.t),
            symbol: data.S,
            frequency: data.T === "b" ? "intraday" : "daily",
          };
          onTick(transformData);
        } else if (data.T === "error") {
          console.error(
            `Alpaca WebSocket returned an error: ${JSON.stringify(data)}`,
          );
          this.intentionalClose = true;
          this.socket?.close();
        }
      }
    });
  }
  stopLiveTickerFeed() {
    this.intentionalClose = true;
    this.socket?.close();
    this.socket = undefined;
  }
  async getSymbolList() {
    if (!this.apiKey || !this.apiSecret)
      throw new Error("Missing Alpaca API secrets in environment.");

    const url = new URL("https://paper-api.alpaca.markets/v2/assets");
    url.searchParams.set("status", "active");
    url.searchParams.set("asset_class", "us_equity");

    try {
      const res = await fetch(url, {
        headers: {
          "APCA-API-KEY-ID": this.apiKey,
          "APCA-API-SECRET-KEY": this.apiSecret,
        },
      });

      if (res.ok) {
        const symbolData = await res.json();
        const tickerList = symbolData.map((x: AlpacaAsset) => {
          const ticker: Ticker = {
            symbol: x.symbol,
            name: x.name,
            exchange: x.exchange,
          };
          return ticker;
        });
        return tickerList;
      } else {
        throw new Error(`HTTP ${res.status}: Failed to fetch symbol list.`);
      }
    } catch (error) {
      console.log(error);
    }
  }
  async getBars(
    tickers: Ticker[],
    freq: Frequency,
    start: Date,
    end: Date,
  ): Promise<Record<string, OHLCVData[]>> {
    if (!this.apiKey || !this.apiSecret)
      throw new Error("Missing Alpaca API secrets in environment.");
    const url = new URL("https://data.alpaca.markets/v2/stocks/bars");

    const freqMapping: Record<Frequency, string> = {
      intraday: "1T",
      daily: "1D",
      weekly: "1W",
      monthly: "1M",
    };

    url.searchParams.set(
      "symbols",
      tickers.map((ticker) => ticker.symbol).join(","),
    );
    url.searchParams.set("timeframe", freqMapping[freq]);
    url.searchParams.set("start", start.toISOString());
    url.searchParams.set("end", end.toISOString());
    url.searchParams.set("adjustment", "split");
    url.searchParams.set("feed", "iex");

    let pageCount = 0;
    const MAX_PAGES = 50;

    let next_page_token: string | null;
    const responses: AlpacaHistBarsResponse[] = [];

    let isFirstPage = true;
    while ((next_page_token || isFirstPage) && pageCount < MAX_PAGES) {
      pageCount++;
      isFirstPage = false;

      if (next_page_token) {
        url.searchParams.set("page_token", next_page_token);
      }

      try {
        const res = await fetch(url, {
          headers: {
            "APCA-API-KEY-ID": this.apiKey,
            "APCA-API-SECRET-KEY": this.apiSecret,
          },
        });
        if (!res.ok) {
          throw new Error(
            `Failed to get stock bars from Alpaca for symbols ${tickers.toString()}`,
          );
        }
        const data: AlpacaHistBarsResponse = await res.json();
        responses.push(data);
        next_page_token = data.next_page_token ?? null;
      } catch (error) {
        console.log(error);
      }
    }
    if (pageCount >= MAX_PAGES) {
      console.warn(
        `Hit max page limit (${MAX_PAGES}) fetching bars for ${tickers.map((ticker) => ticker.symbol).toString()}`,
      );
    }
    const symbolBars: Record<string, OHLCVData[]> = {};
    for (const res of responses) {
      for (const symbol of Object.keys(res.bars)) {
        const bars: OHLCVData[] = res.bars[symbol].map((bar) => {
          return {
            open: bar.o,
            low: bar.l,
            high: bar.h,
            close: bar.c,
            volume: bar.v,
            time: new Date(bar.t),
          };
        });
        // update bars for ticker symbol key, without overwriting if key exists.
        symbolBars[symbol] = (symbolBars[symbol] ?? []).concat(bars);
      }
    }
    return symbolBars;
  }
  async getBarsForTicker(
    ticker: Ticker,
    freq: Frequency,
    start: Date,
    end: Date,
  ): Promise<OHLCVData[]> {
    const bars = await this.getBars([ticker], freq, start, end);
    const ohlcv = bars[ticker.symbol] ?? [];
    return ohlcv;
  }
}
