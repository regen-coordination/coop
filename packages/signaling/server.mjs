import http from 'node:http';
import { WebSocketServer } from 'ws';

const wsReadyStateConnecting = 0;
const wsReadyStateOpen = 1;
const pingTimeout = 30_000;
const port = Number(process.env.PORT ?? 4444);
const host = process.env.HOST ?? '127.0.0.1';
const topics = new Map();

const server = http.createServer((_request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' });
  response.end('okay');
});

const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });

function send(connection, message) {
  if (
    connection.readyState !== wsReadyStateConnecting &&
    connection.readyState !== wsReadyStateOpen
  ) {
    connection.close();
    return;
  }

  try {
    connection.send(JSON.stringify(message));
  } catch {
    connection.close();
  }
}

function onConnection(connection) {
  const subscribedTopics = new Set();
  let closed = false;
  let pongReceived = true;

  const pingInterval = setInterval(() => {
    if (!pongReceived) {
      connection.close();
      clearInterval(pingInterval);
      return;
    }

    pongReceived = false;
    try {
      connection.ping();
    } catch {
      connection.close();
    }
  }, pingTimeout);

  connection.on('pong', () => {
    pongReceived = true;
  });

  connection.on('close', () => {
    for (const topicName of subscribedTopics) {
      const subscribers = topics.get(topicName) ?? new Set();
      subscribers.delete(connection);
      if (subscribers.size === 0) {
        topics.delete(topicName);
      }
    }
    subscribedTopics.clear();
    closed = true;
    clearInterval(pingInterval);
  });

  connection.on('message', (rawMessage) => {
    let message = rawMessage;
    if (typeof message === 'string' || message instanceof Buffer) {
      try {
        message = JSON.parse(message);
      } catch {
        console.warn('[ws] malformed JSON from client, dropping');
        return;
      }
    }

    if (!message?.type || closed) {
      return;
    }

    switch (message.type) {
      case 'subscribe':
        for (const topicName of message.topics ?? []) {
          if (typeof topicName !== 'string') {
            continue;
          }
          const topic = topics.get(topicName) ?? new Set();
          topic.add(connection);
          topics.set(topicName, topic);
          subscribedTopics.add(topicName);
        }
        break;
      case 'unsubscribe':
        for (const topicName of message.topics ?? []) {
          const subscribers = topics.get(topicName);
          subscribers?.delete(connection);
          if (subscribers?.size === 0) {
            topics.delete(topicName);
          }
        }
        break;
      case 'publish':
        if (!message.topic) {
          break;
        }
        for (const receiver of topics.get(message.topic) ?? []) {
          send(receiver, {
            ...message,
            clients: topics.get(message.topic)?.size ?? 0,
          });
        }
        break;
      case 'ping':
        send(connection, { type: 'pong' });
        break;
    }
  });
}

wss.on('connection', onConnection);

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (connection) => {
    wss.emit('connection', connection, request);
  });
});

function shutdown() {
  console.log('Shutting down signaling server…');
  for (const client of wss.clients) {
    client.close(1001, 'server shutting down');
  }
  wss.close();
  server.close();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

server.listen(port, host, () => {
  console.log(`Coop signaling server listening on http://${host}:${port}`);
});
