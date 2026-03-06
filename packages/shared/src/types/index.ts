export type CoopPillar = 'impact-reporting' | 'coordination' | 'governance' | 'capital-formation';

export type NodeRole = 'anchor' | 'standard';

export interface CoopMember {
  id: string;
  displayName: string;
  role: 'admin' | 'member' | 'observer';
}

export interface CoopSettings {
  voiceFirst: boolean;
  defaultPillars: CoopPillar[];
  notificationsEnabled: boolean;
}

export interface Coop {
  id: string;
  name: string;
  description?: string;
  shareCode: string;
  anchorNodeId?: string;
  members: CoopMember[];
  settings: CoopSettings;
  createdAt: string;
}

export interface NodeIdentity {
  id: string;
  coopId: string;
  role: NodeRole;
  publicKey?: string;
  hasInferenceAccess: boolean;
}

export interface StorageCapabilities {
  local: boolean;
  p2p: boolean;
  cold: boolean;
}

export interface Node {
  identity: NodeIdentity;
  storage: StorageCapabilities;
}

export interface SkillDefinition {
  id: string;
  name: string;
  version: string;
  pillar: CoopPillar;
  description: string;
  inputSchemaRef?: string;
  outputSchemaRef?: string;
}

export interface CoopMessage<TPayload = unknown> {
  id: string;
  coopId: string;
  fromNodeId: string;
  type:
    | 'tab.captured'
    | 'voice.transcribed'
    | 'content.proposed'
    | 'content.approved'
    | 'sync.request'
    | 'sync.response';
  payload: TPayload;
  createdAt: string;
}
