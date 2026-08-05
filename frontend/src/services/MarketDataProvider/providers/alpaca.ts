import { MarketDataProvider } from "../MarketDataProvider.ts";
import { Ticker, OHLCVData } from "@shared/types";

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

type LiveBarListener = (data: OHLCVData) => void;

const RECONNECT_DELAY_MS = 2000;

// Alpaca only allows a single upstream connection per feed, so the backend
// owns that connection (with the API credentials) and relays bar messages
// down to browser clients over its own WebSocket endpoint. This class never
// talks to Alpaca directly, and holds no API secrets.
function liveFeedUrl(): string {
  const apiUrl: string = import.meta.env.API_URL;
  return `${apiUrl.replace(/^http/, "ws")}/ws/live`;
}

export class AlpacaProvider implements MarketDataProvider {
  private socket?: WebSocket;
  private intentionalClose: boolean = false;
  private reconnectTimeout: ReturnType<typeof setTimeout> | undefined;
  private readonly subscriptions: Set<string> = new Set();
  private readonly listeners: Map<string, Set<LiveBarListener>> =
    new Map();

  subscribeTickers(tickers: Ticker[], onTick: LiveBarListener) {
    const added: string[] = [];
    for (const ticker of tickers) {
      if (!ticker.symbol) continue;
      if (!this.subscriptions.has(ticker.symbol)) added.push(ticker.symbol);
      this.subscriptions.add(ticker.symbol);
      let listeners = this.listeners.get(ticker.symbol);
      if (!listeners) {
        listeners = new Set();
        this.listeners.set(ticker.symbol, listeners);
      }
      listeners.add(onTick);
    }
    this.ensureSocketConnected();
    this.sendSubscribe(added);
  }

  unsubscribeTickers(tickers: Ticker[], onTick: LiveBarListener) {
    const removed: string[] = [];
    for (const ticker of tickers) {
      if (!ticker.symbol) continue;
      const listeners = this.listeners.get(ticker.symbol);
      if (!listeners) continue;
      listeners.delete(onTick);
      if (listeners.size === 0) {
        this.listeners.delete(ticker.symbol);
        this.subscriptions.delete(ticker.symbol);
        removed.push(ticker.symbol);
      }
    }
    if (this.subscriptions.size === 0) {
      this.stopLiveTickerFeed();
    } else if (removed.length > 0) {
      this.sendUnsubscribe(removed);
    }
  }

  startLiveTickerFeed(tickers: Ticker[], onTick: LiveBarListener) {
    this.subscribeTickers(tickers, onTick);
  }

  private ensureSocketConnected() {
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }
    this.openSocket();
  }

  private openSocket() {
    this.intentionalClose = false;

    this.socket = new WebSocket(liveFeedUrl());

    this.socket.addEventListener("open", () => {
      console.log("Live ticker feed connected.");
      // (Re)send the full subscription set -- covers both the first
      // connection and any reconnect after a drop.
      this.sendSubscribe(Array.from(this.subscriptions));
    });
    this.socket.addEventListener("close", (event) => {
      if (event.target !== this.socket) return; // stale socket, ignore. socket.close() is async
      if (this.intentionalClose) return;
      console.log(
        "Live ticker feed disconnected, reconnecting in 2 seconds...",
      );
      this.reconnectTimeout = setTimeout(() => {
        if (this.subscriptions.size > 0) this.openSocket();
      }, RECONNECT_DELAY_MS);
    });
    this.socket.addEventListener("error", () => {
      console.error("Live ticker feed WebSocket error.");
    });
    this.socket.addEventListener("message", (msg) => {
      let messages: AlpacaBarMessage[];
      try {
        messages = JSON.parse(msg.data);
      } catch {
        console.error(`Malformed message from live ticker feed: ${msg.data}`);
        return;
      }
      for (const data of messages) {
        this.handleBarMessage(data);
      }
    });
  }

  private sendSubscribe(symbols: string[]) {
    if (
      !this.socket ||
      this.socket.readyState !== WebSocket.OPEN ||
      symbols.length === 0
    )
      return;
    this.socket.send(
      JSON.stringify({
        action: "subscribe",
        bars: symbols,
        dailyBars: symbols,
      }),
    );
  }

  private sendUnsubscribe(symbols: string[]) {
    if (
      !this.socket ||
      this.socket.readyState !== WebSocket.OPEN ||
      symbols.length === 0
    )
      return;
    this.socket.send(
      JSON.stringify({
        action: "unsubscribe",
        bars: symbols,
        dailyBars: symbols,
      }),
    );
  }

  private handleBarMessage(data: AlpacaBarMessage) {
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
    const listeners = this.listeners.get(data.S);
    if (!listeners) return;
    for (const listener of listeners) {
      listener(transformData);
    }
  }

  stopLiveTickerFeed() {
    this.intentionalClose = true;
    clearTimeout(this.reconnectTimeout);
    this.socket?.close();
    this.socket = undefined;
    this.listeners.clear();
    this.subscriptions.clear();
  }
}
