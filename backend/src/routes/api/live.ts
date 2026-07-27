import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { Server } from "http";
import { OHLCVData } from "@shared/types";
/**
 * TODO: Rewrite this shit
 * **/
type AlpacaMessage = {
  T: string;
  msg?: string;
  S?: string;
  o?: number;
  h?: number;
  l?: number;
  c?: number;
  v?: number;
  t?: string;
};

let socket: WebSocket | undefined;
const apiKey = process.env.ALPACA_API_KEY!;
const apiSecret = process.env.ALPACA_API_SECRET!;
let intentionalClose: boolean = false;
let reconnectTimeout: ReturnType<typeof setTimeout>;
const clients: Set<WebSocket> = new Set();

function broadcast(data: string) {
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

function startLiveTickerFeed(tickers: string[]) {
  stopLiveTickerFeed();

  intentionalClose = false;

  const version = "v2";
  const feed = "iex";

  socket = new WebSocket(`wss://stream.data.alpaca.markets/${version}/${feed}`);
  socket.addEventListener("open", (event) => {
    console.log("Alpaca WebSocket connected.");
    socket!.send(
      JSON.stringify({
        action: "auth",
        key: apiKey,
        secret: apiSecret,
      }),
    );
  });
  socket.addEventListener("close", (event) => {
    if (event.target !== socket) return;
    if (intentionalClose) return;
    console.log("Alpaca WebSocket disconnected, reconnecting in 2 seconds...");
    reconnectTimeout = setTimeout(() => startLiveTickerFeed(tickers), 2000);
  });
  socket.addEventListener("error", (error) => {
    console.error(`Alpaca WebSocket Error: ${error}`);
  });
  socket.addEventListener("message", (msg) => {
    let messages: AlpacaMessage[];
    try {
      messages = JSON.parse(String(msg.data));
    } catch (error) {
      console.error(`Malformed message from Alpaca WebSocket: ${msg.data}`);
      return;
    }
    for (const data of messages as AlpacaMessage[]) {
      console.log(`Type of Alpaca WebSocket message recieved: ${data.T}`);
      if (data.T === "success" && data.msg === "authenticated") {
        console.log("Alpaca WebSocket Authenticated.");
        socket!.send(
          JSON.stringify({
            action: "subscribe",
            bars: tickers,
            dailyBars: tickers,
          }),
        );
      } else if (data.T === "b" || data.T === "d") {
        const bar: OHLCVData = {
          open: data.o!,
          close: data.c!,
          high: data.h!,
          low: data.l!,
          volume: data.v!,
          time: new Date(data.t!),
          symbol: data.S!,
          frequency: data.T === "b" ? "intraday" : "daily",
        };
        broadcast(JSON.stringify(bar));
      } else if (data.T === "error") {
        console.error(
          `Alpaca WebSocket returned an error: ${JSON.stringify(data)}`,
        );
        intentionalClose = true;
        socket?.close();
      }
    }
  });
}

function stopLiveTickerFeed() {
  intentionalClose = true;
  clearTimeout(reconnectTimeout);
  socket?.close();
  socket = undefined;
}

export function setupLiveProxy(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request: IncomingMessage, socket, head) => {
    const url = new URL(request.url!, `http://${request.headers.host}`);
    if (url.pathname !== "/api/live") {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  wss.on("connection", (clientWs: WebSocket, request: IncomingMessage) => {
    const url = new URL(request.url!, `http://${request.headers.host}`);
    const tickersParam = url.searchParams.get("tickers") || "";
    const symbols = tickersParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (symbols.length === 0) {
      clientWs.close(1008, "Missing tickers parameter.");
      return;
    }

    clients.add(clientWs);
    startLiveTickerFeed(symbols);

    clientWs.on("close", () => {
      clients.delete(clientWs);
      if (clients.size === 0) {
        stopLiveTickerFeed();
      }
    });

    clientWs.on("error", () => {
      clients.delete(clientWs);
    });
  });
}
