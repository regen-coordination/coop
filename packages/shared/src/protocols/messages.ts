export const COOP_MESSAGE_TYPE = {
  TAB_CAPTURED: "tab.captured",
  VOICE_TRANSCRIBED: "voice.transcribed",
  CONTENT_PROPOSED: "content.proposed",
  CONTENT_APPROVED: "content.approved",
  SYNC_REQUEST: "sync.request",
  SYNC_RESPONSE: "sync.response",
  STORAGE_PUT: "storage.put",
} as const;

export type CoopMessageType = (typeof COOP_MESSAGE_TYPE)[keyof typeof COOP_MESSAGE_TYPE];

export interface CoopMessage<TPayload = unknown> {
  id: string;
  coopId: string;
  fromNodeId: string;
  type: CoopMessageType;
  payload: TPayload;
  createdAt: string;
}

export interface CreateCoopMessageInput<TPayload> {
  coopId: string;
  fromNodeId: string;
  type: CoopMessageType;
  payload: TPayload;
  id?: string;
  createdAt?: string;
}

function createMessageId(): string {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  if (randomUuid) {
    return randomUuid;
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createCoopMessage<TPayload>(
  input: CreateCoopMessageInput<TPayload>,
): CoopMessage<TPayload> {
  return {
    id: input.id ?? createMessageId(),
    coopId: input.coopId,
    fromNodeId: input.fromNodeId,
    type: input.type,
    payload: input.payload,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}
