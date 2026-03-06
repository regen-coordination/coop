import Fastify from 'fastify';
import { WebSocketServer } from 'ws';
import { registerRoutes } from './api/routes';

const PORT = Number(process.env.COOP_ANCHOR_PORT ?? 8787);
const WS_PORT = Number(process.env.COOP_ANCHOR_WS_PORT ?? 8788);

async function start(): Promise<void> {
  const app = Fastify({ logger: true });
  await registerRoutes(app);
  await app.listen({ host: '0.0.0.0', port: PORT });

  const wss = new WebSocketServer({ port: WS_PORT });
  wss.on('connection', (socket) => {
    socket.on('message', (raw) => {
      wss.clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(raw.toString());
        }
      });
    });
  });
}

void start();
