import MarketDataProvider from "../marketDataProvider.ts";
import { Ticker } from "@shared/types";

export class AlpacaProvider implements MarketDataProvider {
  private socket?: WebSocket;

  startLiveTickerFeed(ticker: Ticker, onTick: (data: unknown) => void) {
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
          key: process.env.ALPACA_API_KEY,
          secret: process.env.ALPACA_API_SECRET,
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
        for (const data of messages) {
          if (data.T === "success" && data.msg === "authenticated") {
            console.log("Alpaca WebSocket Authenticated.");
            this.socket!.send(
              JSON.stringify({ action: "subscribe", bars: [ticker.symbol] }),
            );
          } else if (data.T === "t") {
            onTick(data);
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
    const apiKey = process.env.ALPACA_API_KEY;
    const apiSecret = process.env.ALPACA_API_SECRET;

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
      const tickerList = symbolData.map((x) => {
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
}
