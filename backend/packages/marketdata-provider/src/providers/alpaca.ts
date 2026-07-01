import MarketDataProvider from "../marketDataProvider.ts";
import { Ticker } from "@shared/types";

class AlpacaProvider implements MarketDataProvider {
  private socket?: WebSocket;

  startLiveTickerFeed(ticker: Ticker, onTick: (data: unknown) => void) {
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
      const data = JSON.parse(msg.data);
      // check for authentication reply message
      if (data.T === "success" && data.msg === "authenticated") {
        console.log("Alpaca WebSocket Authenticated.");
        this.socket!.send(
          JSON.stringify({ action: "subscribe", trades: [ticker.symbol] }),
        );
      } else if (data.T === "t") {
        onTick(data);
      }
    });
  }
  stopLiveTickerFeed() {
    this.socket!.close();
  }
}
