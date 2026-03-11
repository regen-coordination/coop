import { describe, expect, it } from 'vitest';
import { derivePasskeyAddress } from '../auth';
import { buildPimlicoRpcUrl, createMockOnchainState } from '../onchain';

describe('auth and onchain helpers', () => {
  it('derives a stable local sender address from passkey material', () => {
    const address = derivePasskeyAddress({
      id: 'credential-1',
      publicKey: '0x1234abcd',
    });

    expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(
      derivePasskeyAddress({
        id: 'credential-1',
        publicKey: '0x1234abcd',
      }),
    ).toBe(address);
  });

  it('creates a mock onchain state for mocked extension flows', () => {
    const state = createMockOnchainState({
      seed: 'coop-seed',
      senderAddress: '0x1111111111111111111111111111111111111111',
      chainKey: 'celo-sepolia',
    });

    expect(state.chainId).toBe(11142220);
    expect(state.chainKey).toBe('celo-sepolia');
    expect(state.safeCapability).toBe('stubbed');
  });

  it('builds the Pimlico RPC url from the selected chain key', () => {
    const url = buildPimlicoRpcUrl('celo', 'test-key');

    expect(url).toContain('/celo/rpc');
    expect(url).toContain('apikey=test-key');
  });
});
