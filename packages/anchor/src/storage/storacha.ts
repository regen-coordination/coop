import * as Client from "@storacha/client";
import * as Delegation from "@ucanto/core/delegation";
import * as Signer from "@ucanto/principal/ed25519";

export interface ColdArtifact {
  coopId: string;
  id: string;
  content: string;
  filename?: string;
  contentType?: string;
}

export interface StoredArtifact {
  cid: string;
  uri: string;
  status: "stored" | "fallback" | "error";
}

interface ClientCache {
  client: Client.Client;
  space: unknown;
}

let clientCache: ClientCache | null = null;

async function initStorachaClient(): Promise<ClientCache | null> {
  const privateKey = process.env.STORACHA_KEY;
  const proofString = process.env.STORACHA_PROOF;

  if (!privateKey) {
    console.warn("[storacha] STORACHA_KEY not configured, using fallback storage");
    return null;
  }

  try {
    const principal = Signer.parse(privateKey);
    const client = await Client.create({ principal });

    if (proofString) {
      try {
        const proof = await Delegation.extract(Buffer.from(proofString, "base64"));
        if (proof.ok) {
          const space = await client.addSpace(proof.ok);
          await client.setCurrentSpace(space.did());
          return { client, space };
        }
      } catch (e) {
        console.warn("[storacha] Failed to parse proof:", e);
      }
    }

    // Try to use first available space if no proof provided
    const spaces = client.spaces();
    if (spaces.length > 0) {
      await client.setCurrentSpace(spaces[0].did());
      return { client, space: spaces[0] };
    }

    console.warn("[storacha] No space available, using fallback");
    return null;
  } catch (e) {
    console.error("[storacha] Failed to initialize client:", e);
    return null;
  }
}

async function getClient(): Promise<ClientCache | null> {
  if (clientCache) return clientCache;
  clientCache = await initStorachaClient();
  return clientCache;
}

function createArtifactBlob(input: ColdArtifact): Blob {
  const content =
    typeof input.content === "string" ? input.content : JSON.stringify(input.content, null, 2);

  const type = input.contentType ?? "application/json";
  const filename = input.filename ?? `artifact-${input.id}.json`;

  return new Blob([content], { type });
}

function generateFallbackCid(id: string): string {
  // Generate a deterministic fallback CID-like string for local tracking
  const encoder = new TextEncoder();
  const data = encoder.encode(`coop:${id}:${Date.now()}`);
  return `bafy-${btoa(String.fromCharCode(...data))
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 44)}`;
}

export async function uploadToStoracha(input: ColdArtifact): Promise<StoredArtifact> {
  const cache = await getClient();

  if (!cache) {
    // Fallback: return mock CID for development/testing
    const fallbackCid = generateFallbackCid(input.id);
    console.warn(`[storacha] Fallback mode - artifact ${input.id} not uploaded to real storage`);
    return {
      cid: fallbackCid,
      uri: `ipfs://${fallbackCid}`,
      status: "fallback",
    };
  }

  try {
    const blob = createArtifactBlob(input);
    const file = new File([blob], input.filename ?? `artifact-${input.id}.json`, {
      type: input.contentType ?? "application/json",
    });

    const cid = await cache.client.uploadFile(file);
    const cidString = cid.toString();

    return {
      cid: cidString,
      uri: `ipfs://${cidString}`,
      status: "stored",
    };
  } catch (e) {
    console.error("[storacha] Upload failed:", e);
    const fallbackCid = generateFallbackCid(input.id);
    return {
      cid: fallbackCid,
      uri: `ipfs://${fallbackCid}`,
      status: "error",
    };
  }
}

export async function uploadDirectory(
  coopId: string,
  artifacts: Array<{ id: string; content: string; filename: string }>,
): Promise<StoredArtifact> {
  const cache = await getClient();

  if (!cache) {
    const fallbackCid = generateFallbackCid(coopId);
    return {
      cid: fallbackCid,
      uri: `ipfs://${fallbackCid}`,
      status: "fallback",
    };
  }

  try {
    const files = artifacts.map(
      (a) => new File([a.content], a.filename, { type: "application/json" }),
    );

    const cid = await cache.client.uploadDirectory(files);
    const cidString = cid.toString();

    return {
      cid: cidString,
      uri: `ipfs://${cidString}`,
      status: "stored",
    };
  } catch (e) {
    console.error("[storacha] Directory upload failed:", e);
    const fallbackCid = generateFallbackCid(coopId);
    return {
      cid: fallbackCid,
      uri: `ipfs://${fallbackCid}`,
      status: "error",
    };
  }
}
