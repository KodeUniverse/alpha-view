import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import { alpacaStreamRelay } from "../../providers/alpacaStream.js";

interface ClientMessage {
  action: "subscribe" | "unsubscribe";
  bars?: string[];
  dailyBars?: string[];
}

// No credentials required from the client -- only the backend ever holds
// the Alpaca API secret.
export function attachLiveFeedSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws/live" });

  wss.on("connection", (client: WebSocket) => {
    alpacaStreamRelay.addClient(client);

    client.on("message", (raw) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      const symbols = Array.from(
        new Set([...(msg.bars ?? []), ...(msg.dailyBars ?? [])]),
      );
      if (symbols.length === 0) return;

      if (msg.action === "subscribe") {
        alpacaStreamRelay.subscribeClient(client, symbols);
      } else if (msg.action === "unsubscribe") {
        alpacaStreamRelay.unsubscribeClient(client, symbols);
      }
    });

    client.on("close", () => {
      alpacaStreamRelay.removeClient(client);
    });
  });
}
