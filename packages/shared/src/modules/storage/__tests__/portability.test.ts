import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import { afterEach, describe, expect, it } from 'vitest';
import type { ReviewDraft } from '../../../contracts/schema';
import { createMockPasskeyIdentity } from '../../auth/identity';
import { createCoop } from '../../coop/flows';
import {
  type CoopDexie,
  buildEncryptedLocalPayloadRecord,
  createCoopDb,
  saveCoopState,
} from '../db';
import {
  exportAgentMemories,
  exportCoopBlobs,
  exportCryptoKeyBundle,
  exportFullDatabase,
  exportPageExtracts,
  exportReceiverData,
  exportReviewDrafts,
  exportTabCandidates,
  importCryptoKeyBundle,
  importFullDatabase,
} from '../portability';

Dexie.dependencies.indexedDB = indexedDB;
Dexie.dependencies.IDBKeyRange = IDBKeyRange;

const databases: CoopDexie[] = [];

function freshDb(): CoopDexie {
  const db = createCoopDb(`coop-port-${crypto.randomUUID()}`);
  databases.push(db);
  return db;
}

afterEach(async () => {
  for (const db of databases) {
    try {
      db.close();
      await Dexie.delete(db.name);
    } catch {
      // ignore cleanup errors
    }
  }
  databases.length = 0;
});

const NOW = '2026-03-22T12:00:00.000Z';

function buildSetupInsights() {
  return {
    summary: 'Portability test insights.',
    crossCuttingPainPoints: ['Context is scattered'],
    crossCuttingOpportunities: ['Shared memory can persist cleanly'],
    lenses: [
      {
        lens: 'capital-formation',
        currentState: 'Links are scattered.',
        painPoints: 'Funding context disappears.',
        improvements: 'Route leads into shared state.',
      },
      {
        lens: 'impact-reporting',
        currentState: 'Reporting is rushed.',
        painPoints: 'Evidence gets dropped.',
        improvements: 'Collect evidence incrementally.',
      },
      {
        lens: 'governance-coordination',
        currentState: 'Calls happen weekly.',
        painPoints: 'Actions slip.',
        improvements: 'Review actions through the board.',
      },
      {
        lens: 'knowledge-garden-resources',
        currentState: 'Resources live in tabs.',
        painPoints: 'Research repeats.',
        improvements: 'Persist high-signal references.',
      },
    ],
  } as const;
}

function buildReviewDraft(overrides: Partial<ReviewDraft> = {}): ReviewDraft {
  return {
    id: `draft-${crypto.randomUUID()}`,
    interpretationId: 'interp-1',
    extractId: 'extract-1',
    sourceCandidateId: 'candidate-1',
    title: 'Test Draft',
    summary: 'A test summary',
    sources: [{ label: 'Source', url: 'https://example.com', domain: 'example.com' }],
    tags: ['test'],
    category: 'resource',
    whyItMatters: 'It matters because tests.',
    suggestedNextStep: 'Review it.',
    suggestedTargetCoopIds: ['coop-1'],
    confidence: 0.8,
    rationale: 'High confidence draft.',
    status: 'draft',
    workflowStage: 'ready',
    attachments: [],
    provenance: {
      type: 'tab',
      interpretationId: 'interp-1',
      extractId: 'extract-1',
      sourceCandidateId: 'candidate-1',
    },
    createdAt: NOW,
    ...overrides,
  };
}

describe('portability', () => {
  describe('full database export/import round-trip', () => {
    it('exports and imports all tables with passphrase encryption', async () => {
      const sourceDb = freshDb();
      const passphrase = 'test-passphrase-strong-enough-123!';

      // Seed settings
      await sourceDb.settings.put({ key: 'session-wrapping-secret', value: 'test-secret-base64' });
      await sourceDb.settings.put({ key: 'sound-preferences', value: { enabled: true } });

      // Seed review drafts
      const draft1 = buildReviewDraft({ id: 'draft-1' });
      const draft2 = buildReviewDraft({ id: 'draft-2', title: 'Another Draft' });
      await sourceDb.reviewDrafts.bulkPut([draft1, draft2]);

      // Seed a coop doc with Yjs state
      const coopResult = createCoop({
        coopName: 'Portability Test Coop',
        purpose: 'Testing data export/import',
        captureMode: 'manual',
        creatorDisplayName: 'Porter',
        seedContribution: 'Initial seed data for portability testing.',
        setupInsights: buildSetupInsights(),
      });
      await saveCoopState(sourceDb, coopResult.state);

      // Export
      const encrypted = await exportFullDatabase(sourceDb, passphrase);
      expect(typeof encrypted).toBe('string');
      expect(encrypted.length).toBeGreaterThan(0);

      // Verify it's actually encrypted (not raw JSON)
      expect(() => JSON.parse(encrypted)).not.toThrow();
      const parsed = JSON.parse(encrypted);
      expect(parsed).toHaveProperty('ciphertext');
      expect(parsed).toHaveProperty('iv');
      expect(parsed).toHaveProperty('salt');

      // Import into fresh DB
      const targetDb = freshDb();
      const result = await importFullDatabase(targetDb, encrypted, passphrase);

      // Verify counts
      expect(result.imported.settings).toBe(2);
      expect(result.imported.reviewDrafts).toBe(2);
      expect(result.imported.coopDocs).toBe(1);

      // Verify data integrity
      const importedSettings = await targetDb.settings.toArray();
      expect(importedSettings).toHaveLength(2);

      const importedDrafts = await targetDb.reviewDrafts.toArray();
      expect(importedDrafts).toHaveLength(2);
      expect(importedDrafts.find((d) => d.id === 'draft-1')?.title).toBe('Test Draft');
      expect(importedDrafts.find((d) => d.id === 'draft-2')?.title).toBe('Another Draft');

      // Verify coopDoc was restored
      const importedDocs = await targetDb.coopDocs.toArray();
      expect(importedDocs).toHaveLength(1);
      expect(importedDocs[0].encodedState).toBeInstanceOf(Uint8Array);
    });
  });

  describe('wrong passphrase fails gracefully', () => {
    it('throws a clear error when decrypting with wrong passphrase', async () => {
      const db = freshDb();
      await db.settings.put({ key: 'test-key', value: 'test-value' });

      const encrypted = await exportFullDatabase(db, 'correct-passphrase');

      await expect(importFullDatabase(freshDb(), encrypted, 'wrong-passphrase')).rejects.toThrow(
        /Invalid passphrase or corrupted backup data/,
      );
    });
  });

  describe('granular exports produce valid JSON', () => {
    it('exports tab candidates with correct type field', async () => {
      const db = freshDb();
      const result = await exportTabCandidates(db);
      const parsed = JSON.parse(result);
      expect(parsed.type).toBe('coop-tab-candidates-export');
      expect(parsed.exportedAt).toBeDefined();
      expect(parsed.data).toEqual([]);
    });

    it('exports page extracts with correct type field', async () => {
      const db = freshDb();
      const result = await exportPageExtracts(db);
      const parsed = JSON.parse(result);
      expect(parsed.type).toBe('coop-page-extracts-export');
      expect(parsed.data).toEqual([]);
    });

    it('exports review drafts with correct type field', async () => {
      const db = freshDb();
      const draft = buildReviewDraft();
      await db.reviewDrafts.put(draft);

      const result = await exportReviewDrafts(db);
      const parsed = JSON.parse(result);
      expect(parsed.type).toBe('coop-review-drafts-export');
      expect(parsed.data).toHaveLength(1);
      expect(parsed.data[0].id).toBe(draft.id);
    });

    it('exports agent memories with correct type field', async () => {
      const db = freshDb();
      const result = await exportAgentMemories(db);
      const parsed = JSON.parse(result);
      expect(parsed.type).toBe('coop-agent-memories-export');
      expect(parsed.data).toEqual([]);
    });

    it('exports receiver data with correct type field', async () => {
      const db = freshDb();
      const result = await exportReceiverData(db);
      const parsed = JSON.parse(result);
      expect(parsed.type).toBe('coop-receiver-data-export');
      expect(parsed.data.pairings).toEqual([]);
      expect(parsed.data.captures).toEqual([]);
    });

    it('exports coop blobs with correct type field', async () => {
      const db = freshDb();
      const result = await exportCoopBlobs(db);
      const parsed = JSON.parse(result);
      expect(parsed.type).toBe('coop-coop-blobs-export');
      expect(parsed.data).toEqual([]);
    });
  });

  describe('crypto key bundle round-trip', () => {
    it('exports and imports all identity and crypto material', async () => {
      const sourceDb = freshDb();
      const passphrase = 'key-bundle-passphrase-456!';

      // Seed wrapping secret
      const wrappingSecret = 'dGVzdC13cmFwcGluZy1zZWNyZXQtMzItYnl0ZXM=';
      await sourceDb.settings.put({
        key: 'session-wrapping-secret',
        value: wrappingSecret,
      });

      // Seed passkey identity
      const { record: identity } = createMockPasskeyIdentity('Porter');
      await sourceDb.identities.put(identity);

      // Seed privacy identity
      const privacyId = {
        id: `privacy-${crypto.randomUUID()}`,
        coopId: 'coop-1',
        memberId: 'member-1',
        commitment: '0xaabbccdd',
        publicKey: ['0x1111', '0x2222'] as [string, string],
        exportedPrivateKey: '0xdeadbeef',
        createdAt: NOW,
      };
      await sourceDb.privacyIdentities.put(privacyId);

      // Seed stealth key pair
      const stealthKP = {
        id: `stealth-${crypto.randomUUID()}`,
        coopId: 'coop-1',
        spendingKey: `0x${'ab'.repeat(32)}`,
        viewingKey: `0x${'cd'.repeat(32)}`,
        spendingPublicKey: `0x${'ef'.repeat(33)}`,
        viewingPublicKey: `0x${'12'.repeat(33)}`,
        metaAddress: `0x${'34'.repeat(67)}`,
        createdAt: NOW,
      };
      await sourceDb.stealthKeyPairs.put(stealthKP);

      // Seed encrypted session material
      const sessionMaterial = {
        capabilityId: `cap-${crypto.randomUUID()}`,
        sessionAddress: '0x1111111111111111111111111111111111111111',
        ciphertext: 'encrypted-session-data',
        iv: 'session-iv-data',
        algorithm: 'aes-gcm' as const,
        wrappedAt: NOW,
        version: 1 as const,
      };
      await sourceDb.encryptedSessionMaterials.put(sessionMaterial);

      // Seed archive secrets
      await sourceDb.settings.put({
        key: 'archive-secrets:coop-1',
        value: { delegationProof: 'proof-data', spaceDid: 'did:key:test' },
      });

      // Export
      const encrypted = await exportCryptoKeyBundle(sourceDb, passphrase);
      expect(typeof encrypted).toBe('string');

      // Import into fresh DB
      const targetDb = freshDb();
      const result = await importCryptoKeyBundle(targetDb, encrypted, passphrase);

      // Verify wrapping secret restored
      const restoredSecret = await targetDb.settings.get('session-wrapping-secret');
      expect(restoredSecret?.value).toBe(wrappingSecret);

      // Verify identity restored
      const restoredIdentities = await targetDb.identities.toArray();
      expect(restoredIdentities).toHaveLength(1);
      expect(restoredIdentities[0].displayName).toBe('Porter');

      // Verify privacy identity restored
      const restoredPrivacy = await targetDb.privacyIdentities.toArray();
      expect(restoredPrivacy).toHaveLength(1);
      expect(restoredPrivacy[0].commitment).toBe('0xaabbccdd');

      // Verify stealth key pair restored
      const restoredStealth = await targetDb.stealthKeyPairs.toArray();
      expect(restoredStealth).toHaveLength(1);
      expect(restoredStealth[0].coopId).toBe('coop-1');

      // Verify session material restored
      const restoredSession = await targetDb.encryptedSessionMaterials.toArray();
      expect(restoredSession).toHaveLength(1);
      expect(restoredSession[0].ciphertext).toBe('encrypted-session-data');

      // Verify archive secrets restored
      const restoredArchiveSecret = await targetDb.settings.get('archive-secrets:coop-1');
      expect(restoredArchiveSecret?.value).toEqual({
        delegationProof: 'proof-data',
        spaceDid: 'did:key:test',
      });

      // Verify counts
      expect(result.imported.identities).toBe(1);
      expect(result.imported.privacyIdentities).toBe(1);
      expect(result.imported.stealthKeyPairs).toBe(1);
      expect(result.imported.encryptedSessionMaterials).toBe(1);
    });
  });

  describe('empty database exports cleanly', () => {
    it('produces valid encrypted output with zero counts', async () => {
      const db = freshDb();
      const passphrase = 'empty-export-pass';

      const encrypted = await exportFullDatabase(db, passphrase);
      expect(typeof encrypted).toBe('string');
      expect(encrypted.length).toBeGreaterThan(0);

      const targetDb = freshDb();
      const result = await importFullDatabase(targetDb, encrypted, passphrase);

      // All counts should be zero
      for (const count of Object.values(result.imported)) {
        expect(count).toBe(0);
      }
    });
  });

  describe('coopDocs Uint8Array survives round-trip', () => {
    it('preserves Yjs encoded state through export/import', async () => {
      const sourceDb = freshDb();
      const passphrase = 'yjs-round-trip-pass';

      // Create a coop doc with real Yjs state
      const coopResult = createCoop({
        coopName: 'Yjs Round-Trip Coop',
        purpose: 'Testing Uint8Array serialization',
        captureMode: 'manual',
        creatorDisplayName: 'Yara',
        seedContribution: 'Seed data for Yjs round-trip testing.',
        setupInsights: buildSetupInsights(),
      });
      await saveCoopState(sourceDb, coopResult.state);

      // Get original encoded state for comparison
      const originalDoc = await sourceDb.coopDocs.get(coopResult.state.profile.id);
      expect(originalDoc).toBeDefined();
      const originalBytes = (originalDoc as NonNullable<typeof originalDoc>).encodedState;

      // Export and import
      const encrypted = await exportFullDatabase(sourceDb, passphrase);
      const targetDb = freshDb();
      await importFullDatabase(targetDb, encrypted, passphrase);

      // Verify the encoded state matches byte-for-byte
      const importedDoc = await targetDb.coopDocs.get(coopResult.state.profile.id);
      expect(importedDoc).toBeDefined();
      const imported = importedDoc as NonNullable<typeof importedDoc>;
      expect(imported.encodedState).toBeInstanceOf(Uint8Array);
      expect(imported.encodedState.length).toBe(originalBytes.length);
      expect(Array.from(imported.encodedState)).toEqual(Array.from(originalBytes));
    });
  });

  describe('import with skip-existing mode', () => {
    it('preserves existing records in target DB', async () => {
      const sourceDb = freshDb();
      const passphrase = 'skip-mode-pass';

      // Create source data
      const draft1 = buildReviewDraft({ id: 'draft-shared', title: 'Source Version' });
      const draft2 = buildReviewDraft({ id: 'draft-source-only', title: 'Source Only' });
      await sourceDb.reviewDrafts.bulkPut([draft1, draft2]);

      const encrypted = await exportFullDatabase(sourceDb, passphrase);

      // Pre-populate target DB with conflicting data
      const targetDb = freshDb();
      const existingDraft = buildReviewDraft({ id: 'draft-shared', title: 'Target Version' });
      const targetOnlyDraft = buildReviewDraft({
        id: 'draft-target-only',
        title: 'Target Only',
      });
      await targetDb.reviewDrafts.bulkPut([existingDraft, targetOnlyDraft]);

      // Import with skip-existing
      const result = await importFullDatabase(targetDb, encrypted, passphrase, {
        mode: 'skip-existing',
      });

      // The shared draft should keep its target version
      const allDrafts = await targetDb.reviewDrafts.toArray();
      const sharedDraft = allDrafts.find((d) => d.id === 'draft-shared');
      expect(sharedDraft?.title).toBe('Target Version');

      // The source-only draft should be imported
      const sourceOnly = allDrafts.find((d) => d.id === 'draft-source-only');
      expect(sourceOnly?.title).toBe('Source Only');

      // The target-only draft should still be there
      const targetOnly = allDrafts.find((d) => d.id === 'draft-target-only');
      expect(targetOnly?.title).toBe('Target Only');

      // Total drafts: 3 (shared + source-only + target-only)
      expect(allDrafts).toHaveLength(3);
    });
  });

  describe('encryptedLocalPayloads survive round-trip', () => {
    it('round-trips encrypted payloads that can be decrypted with restored wrapping secret', async () => {
      const sourceDb = freshDb();
      const passphrase = 'payload-round-trip-pass';

      // Build an encrypted payload (this auto-creates the wrapping secret)
      const testData = new TextEncoder().encode(
        JSON.stringify({ title: 'Secret Data', content: 'Very private' }),
      );
      const payload = await buildEncryptedLocalPayloadRecord({
        db: sourceDb,
        kind: 'tab-candidate',
        entityId: 'tab-1',
        bytes: testData,
      });
      await sourceDb.encryptedLocalPayloads.put(payload);

      // Export the full database (includes settings with wrapping secret + encrypted payloads)
      const encrypted = await exportFullDatabase(sourceDb, passphrase);

      // Import into fresh DB
      const targetDb = freshDb();
      const result = await importFullDatabase(targetDb, encrypted, passphrase);

      expect(result.imported.encryptedLocalPayloads).toBe(1);
      expect(result.imported.settings).toBeGreaterThanOrEqual(1);

      // Verify the encrypted payload record survived
      const importedPayloads = await targetDb.encryptedLocalPayloads.toArray();
      expect(importedPayloads).toHaveLength(1);
      expect(importedPayloads[0].id).toBe(payload.id);
      expect(importedPayloads[0].ciphertext).toBe(payload.ciphertext);
      expect(importedPayloads[0].iv).toBe(payload.iv);
      expect(importedPayloads[0].salt).toBe(payload.salt);

      // Verify the wrapping secret was also restored
      const restoredSecret = await targetDb.settings.get('session-wrapping-secret');
      const originalSecret = await sourceDb.settings.get('session-wrapping-secret');
      expect(restoredSecret?.value).toBe(originalSecret?.value);
    });
  });
});
