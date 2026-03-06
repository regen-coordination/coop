import type { CoopMessage } from '../types';

export interface MembraneTransport {
  publish(message: CoopMessage): Promise<void>;
  subscribe(handler: (message: CoopMessage) => void): () => void;
}

export interface ConsensusPolicy {
  approve(message: CoopMessage): Promise<boolean>;
}

export class AnchorAutoApproveConsensus implements ConsensusPolicy {
  async approve(_message: CoopMessage): Promise<boolean> {
    return true;
  }
}
