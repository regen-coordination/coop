import { describe, expect, it, vi } from 'vitest';

// Mock @semaphore-protocol/core to avoid fetching ZK artifacts over the network.
// Copied from anonymous-publish.test.ts — generates deterministic proof-shaped objects
// and verifies them by checking a marker field.
const MOCK_PROOF_MARKER = '__mock_semaphore_proof__';

vi.mock('@semaphore-protocol/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@semaphore-protocol/core')>();

  return {
    ...original,
    generateProof: vi.fn(
      async (
        _identity: unknown,
        group: { root: bigint; size: number; depth: number },
        message: string | bigint | Uint8Array,
        scope: string | bigint | Uint8Array,
      ) => {
        const toNumericString = (val: string | bigint | Uint8Array): string => {
          const str = typeof val === 'bigint' ? val.toString() : val.toString();
          let hash = 0n;
          for (let i = 0; i < str.length; i++) {
            hash = (hash * 31n + BigInt(str.charCodeAt(i))) % 2n ** 64n;
          }
          return hash.toString();
        };

        const scopeStr = toNumericString(scope);
        const messageStr = toNumericString(message);

        return {
          merkleTreeDepth: group.depth ?? 16,
          merkleTreeRoot: group.root.toString(),
          nullifier: scopeStr,
          message: messageStr,
          scope: scopeStr,
          points: ['1', '2', '3', '4', '5', '6', '7', '8'],
          [MOCK_PROOF_MARKER]: true,
        };
      },
    ),
    verifyProof: vi.fn(async (proof: Record<string, unknown>) => {
      return proof[MOCK_PROOF_MARKER] === true;
    }),
  };
});

import { generateMembershipProof, verifyMembershipProof } from '../membership-proof';

// Minimal mock objects that satisfy the function signatures.
// The functions cast them to Semaphore types internally.
const mockIdentity = { privateKey: 'mock-pk', commitment: 123n };
const mockGroup = { root: 999n, size: 2, depth: 16 };

describe('membership-proof', () => {
  describe('generateMembershipProof', () => {
    it('returns a proof-shaped object with expected fields', async () => {
      const proof = await generateMembershipProof(
        mockIdentity,
        mockGroup,
        'artifact-abc',
        'coop-scope',
      );
      expect(proof).toHaveProperty('merkleTreeDepth');
      expect(proof).toHaveProperty('merkleTreeRoot');
      expect(proof).toHaveProperty('nullifier');
      expect(proof).toHaveProperty('message');
      expect(proof).toHaveProperty('scope');
      expect(proof).toHaveProperty('points');
    });

    it('uses the group depth for merkleTreeDepth', async () => {
      const proof = await generateMembershipProof(
        mockIdentity,
        mockGroup,
        'msg',
        'scope',
      );
      expect(proof.merkleTreeDepth).toBe(16);
    });

    it('uses the group root for merkleTreeRoot', async () => {
      const proof = await generateMembershipProof(
        mockIdentity,
        mockGroup,
        'msg',
        'scope',
      );
      expect(proof.merkleTreeRoot).toBe('999');
    });
  });

  describe('verifyMembershipProof', () => {
    it('returns true for a valid mock proof', async () => {
      const proof = await generateMembershipProof(
        mockIdentity,
        mockGroup,
        'msg',
        'scope',
      );
      const isValid = await verifyMembershipProof(proof);
      expect(isValid).toBe(true);
    });

    it('returns false for a tampered proof without the marker', async () => {
      const tamperedProof = {
        merkleTreeDepth: 16,
        merkleTreeRoot: '999',
        nullifier: 'fake',
        message: 'fake',
        scope: 'fake',
        points: ['1', '2'],
      };
      const isValid = await verifyMembershipProof(tamperedProof);
      expect(isValid).toBe(false);
    });
  });

  describe('round-trip', () => {
    it('generate then verify succeeds', async () => {
      const proof = await generateMembershipProof(
        mockIdentity,
        mockGroup,
        'artifact-xyz',
        'coop-1',
      );
      const isValid = await verifyMembershipProof(proof);
      expect(isValid).toBe(true);
    });
  });

  describe('determinism and uniqueness', () => {
    it('different messages produce different proof message fields', async () => {
      const proof1 = await generateMembershipProof(
        mockIdentity,
        mockGroup,
        'message-alpha',
        'same-scope',
      );
      const proof2 = await generateMembershipProof(
        mockIdentity,
        mockGroup,
        'message-beta',
        'same-scope',
      );
      expect(proof1.message).not.toBe(proof2.message);
    });

    it('different scopes produce different nullifiers', async () => {
      const proof1 = await generateMembershipProof(
        mockIdentity,
        mockGroup,
        'same-message',
        'scope-one',
      );
      const proof2 = await generateMembershipProof(
        mockIdentity,
        mockGroup,
        'same-message',
        'scope-two',
      );
      expect(proof1.nullifier).not.toBe(proof2.nullifier);
    });

    it('same inputs produce the same proof fields', async () => {
      const proof1 = await generateMembershipProof(
        mockIdentity,
        mockGroup,
        'msg',
        'scope',
      );
      const proof2 = await generateMembershipProof(
        mockIdentity,
        mockGroup,
        'msg',
        'scope',
      );
      expect(proof1.message).toBe(proof2.message);
      expect(proof1.nullifier).toBe(proof2.nullifier);
      expect(proof1.scope).toBe(proof2.scope);
    });
  });
});
