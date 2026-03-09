import assert from "node:assert";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { WebSocket } from "ws";
import { WebSocketServer } from "ws";

type WsMessage = {
  type?: string;
  coopId?: string;
  error?: string;
  id?: string;
  createdAt?: string;
  payload?: {
    title?: string;
    transcript?: string;
    url?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

describe("WebSocket Relay Integration", () => {
  let wss: WebSocketServer;
  const WS_PORT = 9876; // Use different port for testing
  const clients: WebSocket[] = [];

  before(() => {
    // Create a test WebSocket server
    wss = new WebSocketServer({ port: WS_PORT });

    const socketStates = new Map<WebSocket, { coopId?: string }>();

    wss.on("connection", (socket) => {
      socketStates.set(socket, {});

      socket.on("message", (raw) => {
        try {
          const message = JSON.parse(raw.toString());
          const state = socketStates.get(socket);

          if (!state) return;

          if (message.type === "join" && message.coopId) {
            state.coopId = message.coopId;
            socket.send(JSON.stringify({ type: "joined", coopId: message.coopId }));
            return;
          }

          // Broadcast to all clients in same coop
          if (state.coopId) {
            const outbound = {
              ...message,
              coopId: state.coopId,
              id: randomUUID(),
              createdAt: new Date().toISOString(),
            };

            for (const [client, clientState] of socketStates.entries()) {
              if (client.readyState === WebSocket.OPEN && clientState.coopId === state.coopId) {
                client.send(JSON.stringify(outbound));
              }
            }
          }
        } catch {
          socket.send(JSON.stringify({ type: "error", error: "invalid_json" }));
        }
      });

      socket.on("close", () => {
        socketStates.delete(socket);
      });
    });
  });

  describe("Connection", () => {
    it("should connect to WebSocket server", async () => {
      const client = new WebSocket(`ws://localhost:${WS_PORT}`);
      clients.push(client);

      await new Promise<void>((resolve, reject) => {
        client.on("open", resolve);
        client.on("error", reject);
      });

      assert.strictEqual(client.readyState, WebSocket.OPEN);
    });

    it("should reject invalid JSON", async () => {
      const client = new WebSocket(`ws://localhost:${WS_PORT}`);
      clients.push(client);

      await new Promise<void>((resolve) => {
        client.on("open", resolve);
      });

      const errorPromise = new Promise<WsMessage>((resolve) => {
        client.once("message", (data) => {
          resolve(JSON.parse(data.toString()));
        });
      });

      client.send("invalid json {");

      const response = await errorPromise;
      assert.strictEqual(response.type, "error");
      assert.ok(response.error);
    });
  });

  describe("Room Scoping", () => {
    it("should join a coop room", async () => {
      const client = new WebSocket(`ws://localhost:${WS_PORT}`);
      clients.push(client);

      await new Promise<void>((resolve) => {
        client.on("open", resolve);
      });

      const joinedPromise = new Promise<WsMessage>((resolve) => {
        client.once("message", (data) => {
          resolve(JSON.parse(data.toString()));
        });
      });

      client.send(
        JSON.stringify({
          type: "join",
          coopId: "test-coop-123",
        }),
      );

      const response = await joinedPromise;
      assert.strictEqual(response.type, "joined");
      assert.strictEqual(response.coopId, "test-coop-123");
    });

    it("should broadcast only to same coop", async () => {
      const coopA_Client1 = new WebSocket(`ws://localhost:${WS_PORT}`);
      const coopA_Client2 = new WebSocket(`ws://localhost:${WS_PORT}`);
      const coopB_Client = new WebSocket(`ws://localhost:${WS_PORT}`);
      clients.push(coopA_Client1, coopA_Client2, coopB_Client);

      // Wait for all connections
      await Promise.all([
        new Promise<void>((resolve) => coopA_Client1.on("open", resolve)),
        new Promise<void>((resolve) => coopA_Client2.on("open", resolve)),
        new Promise<void>((resolve) => coopB_Client.on("open", resolve)),
      ]);

      // Join coops
      coopA_Client1.send(JSON.stringify({ type: "join", coopId: "coop-a" }));
      coopA_Client2.send(JSON.stringify({ type: "join", coopId: "coop-a" }));
      coopB_Client.send(JSON.stringify({ type: "join", coopId: "coop-b" }));

      // Wait for join confirmations
      await Promise.all([
        new Promise<void>((resolve) => coopA_Client1.once("message", () => resolve())),
        new Promise<void>((resolve) => coopA_Client2.once("message", () => resolve())),
        new Promise<void>((resolve) => coopB_Client.once("message", () => resolve())),
      ]);

      // Setup listeners
      const coopA_Client2Messages: WsMessage[] = [];
      const coopB_ClientMessages: WsMessage[] = [];

      coopA_Client2.on("message", (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type !== "joined") coopA_Client2Messages.push(msg);
      });

      coopB_Client.on("message", (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type !== "joined") coopB_ClientMessages.push(msg);
      });

      // Send message from coop A
      coopA_Client1.send(
        JSON.stringify({
          type: "tab.captured",
          payload: { title: "Test Page", url: "https://example.com" },
        }),
      );

      // Wait for broadcast
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Client 2 in coop A should receive it
      assert.strictEqual(coopA_Client2Messages.length, 1);
      assert.strictEqual(coopA_Client2Messages[0].type, "tab.captured");
      assert.strictEqual(coopA_Client2Messages[0].coopId, "coop-a");

      // Client in coop B should NOT receive it
      assert.strictEqual(coopB_ClientMessages.length, 0);
    });
  });

  describe("Message Types", () => {
    it("should relay tab.captured messages", async () => {
      const client1 = new WebSocket(`ws://localhost:${WS_PORT}`);
      const client2 = new WebSocket(`ws://localhost:${WS_PORT}`);
      clients.push(client1, client2);

      await Promise.all([
        new Promise<void>((resolve) => client1.on("open", resolve)),
        new Promise<void>((resolve) => client2.on("open", resolve)),
      ]);

      // Join
      client1.send(JSON.stringify({ type: "join", coopId: "test-coop" }));
      client2.send(JSON.stringify({ type: "join", coopId: "test-coop" }));

      await Promise.all([
        new Promise<void>((resolve) => client1.once("message", () => resolve())),
        new Promise<void>((resolve) => client2.once("message", () => resolve())),
      ]);

      // Listen for tab capture
      const messagePromise = new Promise<WsMessage>((resolve) => {
        client2.once("message", (data) => {
          const msg = JSON.parse(data.toString()) as WsMessage;
          if (msg.type === "tab.captured") resolve(msg);
        });
      });

      client1.send(
        JSON.stringify({
          type: "tab.captured",
          payload: { title: "My Article", url: "https://test.com/article" },
        }),
      );

      const message = await messagePromise;
      assert.strictEqual(message.type, "tab.captured");
      assert.strictEqual(message.payload.title, "My Article");
      assert.ok(message.id);
      assert.ok(message.createdAt);
    });

    it("should relay voice.transcribed messages", async () => {
      const client1 = new WebSocket(`ws://localhost:${WS_PORT}`);
      const client2 = new WebSocket(`ws://localhost:${WS_PORT}`);
      clients.push(client1, client2);

      await Promise.all([
        new Promise<void>((resolve) => client1.on("open", resolve)),
        new Promise<void>((resolve) => client2.on("open", resolve)),
      ]);

      client1.send(JSON.stringify({ type: "join", coopId: "voice-coop" }));
      client2.send(JSON.stringify({ type: "join", coopId: "voice-coop" }));

      await Promise.all([
        new Promise<void>((resolve) => client1.once("message", () => resolve())),
        new Promise<void>((resolve) => client2.once("message", () => resolve())),
      ]);

      const messagePromise = new Promise<WsMessage>((resolve) => {
        client2.once("message", (data) => {
          const msg = JSON.parse(data.toString()) as WsMessage;
          if (msg.type === "voice.transcribed") resolve(msg);
        });
      });

      client1.send(
        JSON.stringify({
          type: "voice.transcribed",
          payload: { transcript: "We planted 50 trees today" },
        }),
      );

      const message = await messagePromise;
      assert.strictEqual(message.type, "voice.transcribed");
      assert.strictEqual(message.payload.transcript, "We planted 50 trees today");
    });
  });

  describe("Disconnection Handling", () => {
    it("should handle client disconnection gracefully", async () => {
      const client = new WebSocket(`ws://localhost:${WS_PORT}`);

      await new Promise<void>((resolve) => {
        client.on("open", resolve);
      });

      client.send(JSON.stringify({ type: "join", coopId: "disconnect-test" }));

      await new Promise<void>((resolve) => {
        client.once("message", () => resolve());
      });

      // Close connection
      client.close();

      // Wait for server to process disconnect
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should not throw, server handles it gracefully
      assert.strictEqual(client.readyState, WebSocket.CLOSED);
    });
  });

  // Cleanup
  after(() => {
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.close();
      }
    }
    wss.close();
  });
});
