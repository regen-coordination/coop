import { COOP_MESSAGE_TYPE, type CoopMessageType } from "./messages";

export const MEMBRANE_EVENT_TYPE = {
  JOIN: "join",
  JOINED: "joined",
  ERROR: "error",
  TAB_CAPTURED: COOP_MESSAGE_TYPE.TAB_CAPTURED,
  VOICE_TRANSCRIBED: COOP_MESSAGE_TYPE.VOICE_TRANSCRIBED,
  CONTENT_PROPOSED: COOP_MESSAGE_TYPE.CONTENT_PROPOSED,
  CONTENT_APPROVED: COOP_MESSAGE_TYPE.CONTENT_APPROVED,
  SYNC_REQUEST: COOP_MESSAGE_TYPE.SYNC_REQUEST,
  SYNC_RESPONSE: COOP_MESSAGE_TYPE.SYNC_RESPONSE,
  STORAGE_PUT: COOP_MESSAGE_TYPE.STORAGE_PUT,
} as const;

export type MembraneEventType =
  | (typeof MEMBRANE_EVENT_TYPE)[keyof typeof MEMBRANE_EVENT_TYPE]
  | CoopMessageType;

export interface MembraneEvent<TPayload = unknown> {
  coopId: string;
  type: MembraneEventType;
  payload: TPayload;
  createdAt: string;
}

export interface CreateMembraneEventInput<TPayload> {
  coopId: string;
  type: MembraneEventType;
  payload: TPayload;
  createdAt?: string;
}

export function createMembraneEvent<TPayload>(
  input: CreateMembraneEventInput<TPayload>,
): MembraneEvent<TPayload> {
  return {
    coopId: input.coopId,
    type: input.type,
    payload: input.payload,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

export class MembraneClient {
  private socket: WebSocket | null = null;
  private handlers = new Set<(event: MembraneEvent) => void>();

  connect(wsUrl: string): void {
    this.socket = new WebSocket(wsUrl);
    this.socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(String(event.data)) as MembraneEvent;
        for (const handler of this.handlers) {
          handler(parsed);
        }
      } catch {
        // Ignore malformed membrane events.
      }
    };
  }

  disconnect(): void {
    if (!this.socket) {
      return;
    }
    this.socket.close();
    this.socket = null;
  }

  publish(event: MembraneEvent): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    this.socket.send(JSON.stringify(event));
  }

  subscribe(handler: (event: MembraneEvent) => void): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }
}
