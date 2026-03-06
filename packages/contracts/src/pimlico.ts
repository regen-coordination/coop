export interface SmartAccountConfig {
  chainId: number;
  owner: string;
  apiKey: string;
}

export interface SmartAccountSession {
  smartAccountAddress: string;
  sessionKey: string;
  permissions: string[];
}

export async function createCoopSmartAccount(config: SmartAccountConfig): Promise<SmartAccountSession> {
  const suffix = config.owner.slice(2, 8).toLowerCase();
  return {
    smartAccountAddress: `0x00000000000000000000000000000000${suffix.padStart(8, '0')}`,
    sessionKey: `session_${config.chainId}_${Date.now()}`,
    permissions: ['gardens.propose', 'green-goods.attest'],
  };
}
