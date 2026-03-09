import { randomUUID } from "node:crypto";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { WebSocket, WebSocketServer } from "ws";
import { registerRoutes } from "./api/routes.js";
import { db } from "./db/connection.js";

const PORT = Number(process.env.COOP_ANCHOR_PORT ?? 8787);
const WS_PORT = Number(process.env.COOP_ANCHOR_WS_PORT ?? 8788);

interface ClientMessage {
  type: string;
  coopId?: string;
  payload?: unknown;
  [key: string]: unknown;
}

interface SocketState {
  coopId?: string;
}

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }

  return (
    origin.startsWith("chrome-extension://") ||
    origin.startsWith("http://localhost") ||
    origin.startsWith("http://127.0.0.1") ||
    origin.startsWith("https://localhost") ||
    origin.startsWith("https://127.0.0.1")
  );
}

async function start(): Promise<void> {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: (origin, callback) => {
      callback(null, isAllowedOrigin(origin));
    },
  });

  await registerRoutes(app);
  await app.listen({ host: "0.0.0.0", port: PORT });

  const wss = new WebSocketServer({ port: WS_PORT });
  const socketStates = new Map<WebSocket, SocketState>();

  wss.on("connection", (socket) => {
    socketStates.set(socket, {});

    socket.on("message", (raw) => {
      let message: ClientMessage;

      try {
        message = JSON.parse(raw.toString()) as ClientMessage;
      } catch {
        socket.send(JSON.stringify({ type: "error", error: "invalid_json" }));
        return;
      }

      const state = socketStates.get(socket);
      if (!state) {
        socket.send(JSON.stringify({ type: "error", error: "state_not_found" }));
        return;
      }

      if (message.type === "join") {
        if (!message.coopId || typeof message.coopId !== "string") {
          socket.send(JSON.stringify({ type: "error", error: "coopId_required" }));
          return;
        }

        const coopExists =
          (db.prepare("SELECT id FROM coops WHERE id = ?").get(message.coopId) as
            | { id: string }
            | undefined) !== undefined;

        if (!coopExists) {
          socket.send(JSON.stringify({ type: "error", error: "coop_not_found" }));
          return;
        }

        state.coopId = message.coopId;
        socket.send(JSON.stringify({ type: "joined", coopId: state.coopId }));
        return;
      }

      if (!state.coopId) {
        socket.send(JSON.stringify({ type: "error", error: "join_required" }));
        return;
      }

      const outbound = {
        ...message,
        coopId: state.coopId,
      };

      db.prepare(
        "INSERT INTO feed_items (id, coop_id, type, content, created_at) VALUES (?, ?, ?, ?, ?)",
      ).run(
        randomUUID(),
        state.coopId,
        `ws.${message.type}`,
        JSON.stringify(outbound),
        new Date().toISOString(),
      );

      for (const [client, clientState] of socketStates.entries()) {
        if (client.readyState !== WebSocket.OPEN) {
          continue;
        }

        if (clientState.coopId === state.coopId) {
          client.send(JSON.stringify(outbound));
        }
      }
    });

    socket.on("close", () => {
      socketStates.delete(socket);
    });
  });

  app.log.info(`Anchor API listening on :${PORT}`);
  app.log.info(`Anchor WebSocket listening on :${WS_PORT}`);
}

void start();
