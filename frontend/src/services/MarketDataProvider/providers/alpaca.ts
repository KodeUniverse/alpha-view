import MarketDataProvider from "../MarketDataProvider.ts";
import { Ticker, OHLCVData, Frequency } from "@shared/types";

type AlpacaMessage = AlpacaAuthMessage | AlpacaBarMessage;

interface AlpacaAuthMessage {
  T: "success" | "error";
  msg: string;
}

interface AlpacaBarMessage {
  T: "b";
  S: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  vw: number;
  n: number;
  t: string; // need to start using Date objects.
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

  startLiveTickerFeed(ticker: Ticker, onTick: (data: OHLCVData) => void) {
    this.stopLiveTickerFeed();

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
      console.log("Alpaca WebSocket disconnected.");
    });
    this.socket.addEventListener("error", (error) => {
      console.log(`Alpaca WebSocket Error: ${error}`);
    });
    this.socket.addEventListener("message", (msg) => {
      try {
        const messages = JSON.parse(msg.data);
        // check for authentication reply message
        for (const data of messages as AlpacaMessage[]) {
          if (data.T === "success" && data.msg === "authenticated") {
            console.log("Alpaca WebSocket Authenticated.");
            this.socket!.send(
              JSON.stringify({ action: "subscribe", bars: [ticker.symbol] }),
            );
          } else if (data.T === "b") {
            const transformData: OHLCVData = {
              open: data.o,
              close: data.c,
              high: data.h,
              low: data.l,
              volume: data.v,
              time: data.t,
            };
            onTick(transformData);
          }
        }
      } catch (error) {
        console.log(
          `Malformed message from Alpaca WebSocket: ${msg.data}\nError:${error}`,
        );
      }
    });
  }
  stopLiveTickerFeed() {
    this.socket?.close();
    this.socket = undefined;
  }
  async getSymbolList() {
    const apiKey = import.meta.env.ALPACA_API_KEY;
    const apiSecret = import.meta.env.ALPACA_API_SECRET;

    if (!apiKey || !apiSecret)
      throw new Error("Missing Alpaca API secrets in environment.");

    const url = new URL("https://paper-api.alpaca.markets/v2/assets");
    url.searchParams.set("status", "active");
    url.searchParams.set("asset_class", "us_equity");

    const res = await fetch(url, {
      headers: {
        "APCA-API-KEY-ID": apiKey,
        "APCA-API-SECRET-KEY": apiSecret,
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
  }
  async getBars(
    tickers: Ticker[],
    freq: Frequency,
    start: Date,
    end: Date,
  ): Promise<Record<string, OHLCVData[]>> {
    const apiKey = import.meta.env.ALPACA_API_KEY;
    const apiSecret = import.meta.env.ALPACA_API_SECRET;

    if (!apiKey || !apiSecret)
      throw new Error("Missing Alpaca API secrets in environment.");
    const url = new URL("https://data.alpaca.markets/v2/stocks/bars");

    const freqMapping: Record<Frequency, string> = {
      intraday: "1T",
      daily: "1D",
      weekly: "1W",
      monthly: "1M",
    };

    url.searchParams.set("symbols", JSON.stringify(tickers));
    url.searchParams.set("timeframe", freqMapping[freq]);
    url.searchParams.set("start", start.toISOString());
    url.searchParams.set("end", end.toISOString());
    url.searchParams.set("adjustment", "split");
    url.searchParams.set("feed", "iex");

    let next_page_token: string | null = "dummy";
    const responses: AlpacaHistBarsResponse[] = [];

    let isFirstPage = true;
    while (next_page_token || isFirstPage) {
      isFirstPage = false;

      if (next_page_token) {
        url.searchParams.set("next_page_token", next_page_token);
      }
      const res = await fetch(url, {
        headers: {
          "APCA-API-KEY-ID": apiKey,
          "APCA-API-SECRET-KEY": apiSecret,
        },
      });
      if (!res.ok) {
        throw new Error(
          `Failed to get stock bars from Alpaca for symbols ${tickers.toString()}`,
        );
      }
      const data: AlpacaHistBarsResponse = await res.json();
      responses.push(data);
      next_page_token = data.next_page_token;
    }
    // TODO: finish this logic below
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
            time: bar.t,
          };
        });
        // update bars for ticker symbol key, without overwriting if key exists.
        symbolBars[symbol] = (symbolBars[symbol] ?? []).concat(bars);
      }
    }
    return symbolBars;
  }
}
