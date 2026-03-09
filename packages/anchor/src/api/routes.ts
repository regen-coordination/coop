import { randomUUID } from "node:crypto";
import type {
  ColdStorageUploadRequest,
  CoopFeedResponse,
  CoopRecord,
  CreateCoopRequest,
  JoinCoopRequest,
  JoinCoopResponse,
  RunSkillRequest,
} from "@coop/shared";
import type { FastifyInstance } from "fastify";
import { runSkill } from "../agent/runtime.js";
import { db } from "../db/connection.js";
import { uploadToStoracha } from "../storage/storacha.js";

interface CoopRow {
  id: string;
  name: string;
  description: string | null;
  share_code: string;
  created_at: string;
}

interface MemberRow {
  id: string;
  coop_id: string;
  display_name: string;
  role: "admin" | "member" | "observer";
  joined_at: string;
}

interface FeedItemRow {
  id: string;
  coop_id: string;
  type: string;
  content: string;
  created_at: string;
}

function parseJsonSafe(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    return input;
  }
}

function createShareCode(length = 8): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join(
    "",
  );
}

function getCoopById(id: string): CoopRow | undefined {
  return db.prepare("SELECT * FROM coops WHERE id = ?").get(id) as CoopRow | undefined;
}

function getCoopByShareCode(shareCode: string): CoopRow | undefined {
  return db.prepare("SELECT * FROM coops WHERE share_code = ?").get(shareCode) as
    | CoopRow
    | undefined;
}

function listMembers(coopId: string): MemberRow[] {
  return db
    .prepare("SELECT * FROM members WHERE coop_id = ? ORDER BY joined_at ASC")
    .all(coopId) as MemberRow[];
}

function mapCoop(coop: CoopRow, members: MemberRow[]): CoopRecord {
  return {
    id: coop.id,
    name: coop.name,
    description: coop.description ?? undefined,
    shareCode: coop.share_code,
    createdAt: coop.created_at,
    members: members.map((member) => ({
      id: member.id,
      displayName: member.display_name,
      role: member.role,
      joinedAt: member.joined_at,
    })),
  };
}

function insertFeedItem(coopId: string, type: string, content: unknown): void {
  db.prepare(
    "INSERT INTO feed_items (id, coop_id, type, content, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(randomUUID(), coopId, type, JSON.stringify(content), new Date().toISOString());
}

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => ({ ok: true }));

  app.post("/api/skills/run", async (request) => {
    const body = request.body as RunSkillRequest;
    return runSkill(body);
  });

  app.post("/api/storage/cold", async (request) => {
    const body = request.body as ColdStorageUploadRequest;
    return uploadToStoracha(body);
  });

  app.post("/api/coops", async (request, reply) => {
    const body = request.body as Partial<CreateCoopRequest>;

    if (!body?.name?.trim()) {
      return reply.code(400).send({ error: "name is required" });
    }

    const coopId = randomUUID();
    const createdAt = new Date().toISOString();
    let shareCode = createShareCode();

    while (
      (db.prepare("SELECT id FROM coops WHERE share_code = ?").get(shareCode) as
        | { id: string }
        | undefined) !== undefined
    ) {
      shareCode = createShareCode();
    }

    db.prepare(
      "INSERT INTO coops (id, name, description, share_code, created_at) VALUES (?, ?, ?, ?, ?)",
    ).run(coopId, body.name.trim(), body.description?.trim() || null, shareCode, createdAt);

    if (body.creatorName?.trim()) {
      db.prepare(
        "INSERT INTO members (id, coop_id, display_name, role, joined_at) VALUES (?, ?, ?, ?, ?)",
      ).run(randomUUID(), coopId, body.creatorName.trim(), "admin", createdAt);
    }

    insertFeedItem(coopId, "coop.created", {
      name: body.name.trim(),
      description: body.description?.trim() || null,
      creatorName: body.creatorName?.trim() || null,
    });

    const coop = getCoopById(coopId);
    if (!coop) {
      return reply.code(500).send({ error: "failed to create coop" });
    }

    return mapCoop(coop, listMembers(coopId));
  });

  app.post("/api/coops/join", async (request, reply) => {
    const body = request.body as Partial<JoinCoopRequest>;

    if (!body?.shareCode?.trim()) {
      return reply.code(400).send({ error: "shareCode is required" });
    }

    const coop = getCoopByShareCode(body.shareCode.trim());
    if (!coop) {
      return reply.code(404).send({ error: "coop not found for share code" });
    }

    request.params = { id: coop.id };
    return app
      .inject({
        method: "POST",
        url: `/api/coops/${coop.id}/join`,
        payload: {
          shareCode: body.shareCode,
          displayName: body.displayName,
          role: body.role,
        },
      })
      .then((result) => {
        reply.code(result.statusCode);
        return result.json();
      });
  });

  app.post("/api/coops/:id/join", async (request, reply) => {
    const params = request.params as { id: string };
    const body = request.body as Partial<JoinCoopRequest>;

    if (!body?.shareCode?.trim()) {
      return reply.code(400).send({ error: "shareCode is required" });
    }

    if (!body?.displayName?.trim()) {
      return reply.code(400).send({ error: "displayName is required" });
    }

    const coop = getCoopById(params.id);
    if (!coop) {
      return reply.code(404).send({ error: "coop not found" });
    }

    if (coop.share_code !== body.shareCode.trim()) {
      return reply.code(403).send({ error: "invalid share code" });
    }

    const existingMember = db
      .prepare("SELECT * FROM members WHERE coop_id = ? AND display_name = ?")
      .get(params.id, body.displayName.trim()) as MemberRow | undefined;

    const role = body.role ?? "member";
    const now = new Date().toISOString();

    if (!existingMember) {
      db.prepare(
        "INSERT INTO members (id, coop_id, display_name, role, joined_at) VALUES (?, ?, ?, ?, ?)",
      ).run(randomUUID(), params.id, body.displayName.trim(), role, now);

      insertFeedItem(params.id, "member.joined", {
        displayName: body.displayName.trim(),
        role,
      });
    }

    const member =
      existingMember ??
      (db
        .prepare("SELECT * FROM members WHERE coop_id = ? AND display_name = ?")
        .get(params.id, body.displayName.trim()) as MemberRow | undefined);

    if (!member) {
      return reply.code(500).send({ error: "failed to join coop" });
    }

    const response: JoinCoopResponse = {
      coop: mapCoop(coop, listMembers(params.id)),
      member: {
        id: member.id,
        displayName: member.display_name,
        role: member.role,
        joinedAt: member.joined_at,
      },
    };

    return response;
  });

  app.get("/api/coops/:id", async (request, reply) => {
    const params = request.params as { id: string };
    const coop = getCoopById(params.id);

    if (!coop) {
      return reply.code(404).send({ error: "coop not found" });
    }

    return mapCoop(coop, listMembers(params.id));
  });

  app.get("/api/coops/:id/feed", async (request, reply) => {
    const params = request.params as { id: string };
    const coop = getCoopById(params.id);

    if (!coop) {
      return reply.code(404).send({ error: "coop not found" });
    }

    const feedItems = db
      .prepare("SELECT * FROM feed_items WHERE coop_id = ? ORDER BY created_at DESC LIMIT 100")
      .all(params.id) as FeedItemRow[];

    const response: CoopFeedResponse = {
      coopId: params.id,
      items: feedItems.map((item) => ({
        id: item.id,
        type: item.type,
        content: parseJsonSafe(item.content),
        createdAt: item.created_at,
      })),
    };

    return response;
  });
}
