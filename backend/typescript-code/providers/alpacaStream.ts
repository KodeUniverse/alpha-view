import { WebSocket } from "ws";
import type { RawData } from "ws";

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

const STREAM_URL = "wss://stream.data.alpaca.markets/v2/iex";
const RECONNECT_DELAY_MS = 2000;

// Alpaca allows only one upstream connection per account, so this owns that
// single connection and fans bar messages out to interested clients.
class AlpacaStreamRelay {
  private upstream?: WebSocket;
  private authenticated = false;
  private intentionalClose = false;
  private reconnectTimeout?: NodeJS.Timeout;

  private readonly interest = new Map<string, Set<WebSocket>>();
  // tracked per-client so we can undo it all on disconnect
  private readonly clientSymbols = new Map<WebSocket, Set<string>>();

  addClient(client: WebSocket) {
    this.clientSymbols.set(client, new Set());
  }

  removeClient(client: WebSocket) {
    const symbols = this.clientSymbols.get(client);
    this.clientSymbols.delete(client);
    if (symbols && symbols.size > 0) {
      this.applySubscriptionDiff(client, symbols, new Set());
    }
  }

  subscribeClient(client: WebSocket, symbols: string[]) {
    const current = this.clientSymbols.get(client) ?? new Set<string>();
    const next = new Set(current);
    for (const symbol of symbols) next.add(symbol);
    this.applySubscriptionDiff(client, current, next);
  }

  unsubscribeClient(client: WebSocket, symbols: string[]) {
    const current = this.clientSymbols.get(client) ?? new Set<string>();
    const next = new Set(current);
    for (const symbol of symbols) next.delete(symbol);
    this.applySubscriptionDiff(client, current, next);
  }

  private applySubscriptionDiff(
    client: WebSocket,
    prev: Set<string>,
    next: Set<string>,
  ) {
    this.clientSymbols.set(client, next);

    const newlyInteresting: string[] = [];
    const noLongerInteresting: string[] = [];

    for (const symbol of next) {
      if (prev.has(symbol)) continue;
      let clients = this.interest.get(symbol);
      if (!clients) {
        clients = new Set();
        this.interest.set(symbol, clients);
        newlyInteresting.push(symbol);
      }
      clients.add(client);
    }

    for (const symbol of prev) {
      if (next.has(symbol)) continue;
      const clients = this.interest.get(symbol);
      if (!clients) continue;
      clients.delete(client);
      if (clients.size === 0) {
        this.interest.delete(symbol);
        noLongerInteresting.push(symbol);
      }
    }

    if (newlyInteresting.length > 0) {
      this.ensureUpstreamConnected();
      this.sendUpstreamSubscribe(newlyInteresting);
    }
    if (noLongerInteresting.length > 0) {
      this.sendUpstreamUnsubscribe(noLongerInteresting);
    }
    if (this.interest.size === 0) {
      this.closeUpstream();
    }
  }

  private ensureUpstreamConnected() {
    if (
      this.upstream &&
      (this.upstream.readyState === WebSocket.OPEN ||
        this.upstream.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }
    this.openUpstream();
  }

  private openUpstream() {
    const key = process.env.ALPACA_API_KEY;
    const secret = process.env.ALPACA_API_SECRET;
    if (!key || !secret) {
      console.error(
        "Alpaca API key/secret is undefined; live ticker feed disabled.",
      );
      return;
    }

    this.intentionalClose = false;
    this.authenticated = false;

    const socket = new WebSocket(STREAM_URL);
    this.upstream = socket;

    socket.on("open", () => {
      console.log("Alpaca upstream WebSocket connected.");
      socket.send(JSON.stringify({ action: "auth", key, secret }));
    });

    socket.on("close", () => {
      if (socket !== this.upstream) return; // stale socket, ignore
      this.upstream = undefined;
      this.authenticated = false;
      if (this.intentionalClose) return;
      console.log(
        "Alpaca upstream WebSocket disconnected, reconnecting in 2 seconds...",
      );
      this.reconnectTimeout = setTimeout(() => {
        if (this.interest.size > 0) this.openUpstream();
      }, RECONNECT_DELAY_MS);
    });

    socket.on("error", (err) => {
      console.error("Alpaca upstream WebSocket error:", err);
    });

    socket.on("message", (raw: RawData) => {
      let messages: AlpacaMessage[];
      try {
        messages = JSON.parse(raw.toString());
      } catch {
        console.error("Malformed message from Alpaca upstream WebSocket.");
        return;
      }
      for (const msg of messages) {
        if (msg.T === "success" && msg.msg === "authenticated") {
          console.log("Alpaca upstream WebSocket authenticated.");
          this.authenticated = true;
          this.sendUpstreamSubscribe(Array.from(this.interest.keys()));
        } else if (msg.T === "b" || msg.T === "d") {
          this.broadcast(msg);
        } else if (msg.T === "error") {
          console.error(
            `Alpaca upstream WebSocket returned an error: ${JSON.stringify(msg)}`,
          );
        }
      }
    });
  }

  private closeUpstream() {
    this.intentionalClose = true;
    clearTimeout(this.reconnectTimeout);
    this.upstream?.close();
    this.upstream = undefined;
    this.authenticated = false;
  }

  private sendUpstreamSubscribe(symbols: string[]) {
    if (
      !this.upstream ||
      this.upstream.readyState !== WebSocket.OPEN ||
      !this.authenticated ||
      symbols.length === 0
    )
      return;
    this.upstream.send(
      JSON.stringify({ action: "subscribe", bars: symbols, dailyBars: symbols }),
    );
  }

  private sendUpstreamUnsubscribe(symbols: string[]) {
    if (
      !this.upstream ||
      this.upstream.readyState !== WebSocket.OPEN ||
      !this.authenticated ||
      symbols.length === 0
    )
      return;
    this.upstream.send(
      JSON.stringify({ action: "unsubscribe", bars: symbols, dailyBars: symbols }),
    );
  }

  private broadcast(bar: AlpacaBarMessage) {
    const clients = this.interest.get(bar.S);
    if (!clients || clients.size === 0) return;
    const payload = JSON.stringify([bar]);
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) client.send(payload);
    }
  }
}

export const alpacaStreamRelay = new AlpacaStreamRelay();
