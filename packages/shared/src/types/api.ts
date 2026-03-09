import type { CoopPillar } from "./index";

export type CoopMemberRole = "admin" | "member" | "observer";

export interface CoopMemberRecord {
  id: string;
  displayName: string;
  role: CoopMemberRole;
  joinedAt: string;
}

export interface CoopRecord {
  id: string;
  name: string;
  description?: string;
  shareCode: string;
  createdAt: string;
  members: CoopMemberRecord[];
}

export interface CreateCoopRequest {
  name: string;
  description?: string;
  creatorName?: string;
}

export type CreateCoopResponse = CoopRecord;

export interface JoinCoopRequest {
  shareCode: string;
  displayName: string;
  role?: CoopMemberRole;
}

export interface JoinCoopResponse {
  coop: CoopRecord;
  member: CoopMemberRecord;
}

export interface CoopFeedItem {
  id: string;
  type: string;
  content: unknown;
  createdAt: string;
}

export interface CoopFeedResponse {
  coopId: string;
  items: CoopFeedItem[];
}

export interface RunSkillRequest {
  coopId: string;
  pillar: CoopPillar;
  text: string;
  sourceType?: "tab" | "voice" | "note";
}

export interface RunSkillResponse {
  summary: string;
  actions: string[];
  stakeholders?: string[];
  metrics?: string[];
  evidence?: string[];
}

export interface ColdStorageUploadRequest {
  coopId: string;
  id: string;
  content: string;
}
