import type { FastifyInstance } from 'fastify';
import { runSkill } from '../agent/runtime';
import { uploadToStoracha } from '../storage/storacha';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({ ok: true }));

  app.post('/api/skills/run', async (request) => {
    const body = request.body as { coopId: string; pillar: any; text: string };
    return runSkill(body);
  });

  app.post('/api/storage/cold', async (request) => {
    const body = request.body as { coopId: string; id: string; content: string };
    return uploadToStoracha(body);
  });
}
