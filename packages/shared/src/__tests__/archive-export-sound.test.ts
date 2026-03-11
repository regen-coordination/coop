import { describe, expect, it } from 'vitest';
import { createArchiveBundle, createMockArchiveReceipt, recordArchiveReceipt } from '../archive';
import {
  exportArchiveReceiptTextBundle,
  exportCoopSnapshotJson,
  exportSnapshotTextBundle,
} from '../export';
import { createCoop } from '../flows';
import { deriveExtensionIconState } from '../icon-state';
import { shouldPlaySound } from '../sound';

function buildSetupInsights() {
  return {
    summary: 'A compact setup payload for testing export and archive behavior.',
    crossCuttingPainPoints: ['Context leaks across too many tools'],
    crossCuttingOpportunities: ['Keep archives explicit and portable'],
    lenses: [
      {
        lens: 'capital-formation',
        currentState: 'Grant tracking is ad hoc.',
        painPoints: 'No durable record.',
        improvements: 'Store approved leads clearly.',
      },
      {
        lens: 'impact-reporting',
        currentState: 'Reports are rushed.',
        painPoints: 'Evidence is fragmented.',
        improvements: 'Make evidence legible sooner.',
      },
      {
        lens: 'governance-coordination',
        currentState: 'Calls generate action items.',
        painPoints: 'Actions disappear.',
        improvements: 'Track action-worthy artifacts.',
      },
      {
        lens: 'knowledge-garden-resources',
        currentState: 'Guides live in private tabs.',
        painPoints: 'People duplicate work.',
        improvements: 'Turn resources into shared memory.',
      },
    ],
  } as const;
}

describe('archive, export, and sound behavior', () => {
  it('creates and stores archive receipts for approved artifacts', () => {
    const created = createCoop({
      coopName: 'Archive Coop',
      purpose: 'Keep approved artifacts portable and durable.',
      creatorDisplayName: 'Kai',
      captureMode: 'manual',
      seedContribution: 'I care about durable long-memory bundles.',
      setupInsights: buildSetupInsights(),
    });
    const artifact = created.state.artifacts[0];
    if (!artifact) {
      throw new Error('Expected an initial artifact.');
    }
    const bundle = createArchiveBundle({
      scope: 'artifact',
      state: created.state,
      artifactIds: [artifact.id],
    });
    const receipt = createMockArchiveReceipt({
      bundle,
      delegationIssuer: 'trusted-node-demo',
      artifactIds: [artifact.id],
    });
    const updated = recordArchiveReceipt(created.state, receipt, [artifact.id]);

    expect(receipt.rootCid.startsWith('bafy')).toBe(true);
    expect(updated.archiveReceipts).toHaveLength(1);
    expect(updated.artifacts[0]?.archiveReceiptIds).toContain(receipt.id);
    expect(updated.artifacts[0]?.archiveStatus).toBe('archived');
    expect(updated.memoryProfile.archiveSignals.archivedTagCounts[artifact.tags[0] ?? '']).toBe(1);
    expect(exportArchiveReceiptTextBundle(receipt)).toContain(receipt.rootCid);
  });

  it('exports structured snapshots without raw passive browsing exhaust', () => {
    const created = createCoop({
      coopName: 'Archive Coop',
      purpose: 'Keep approved artifacts portable and durable.',
      creatorDisplayName: 'Kai',
      captureMode: 'manual',
      seedContribution: 'I care about durable long-memory bundles.',
      setupInsights: buildSetupInsights(),
    });

    const json = exportCoopSnapshotJson(created.state);
    const text = exportSnapshotTextBundle(created.state);

    expect(json).toContain('"type": "coop-snapshot"');
    expect(json).not.toContain('tabCandidates');
    expect(text).toContain('Archive Coop');
    expect(text).toContain('Safe:');
  });

  it('keeps sounds muted by default and only allows explicit success moments', () => {
    expect(
      shouldPlaySound('coop-created', {
        enabled: false,
        reducedMotion: false,
        reducedSound: false,
      }),
    ).toBe(false);

    expect(
      shouldPlaySound(
        'artifact-published',
        {
          enabled: true,
          reducedMotion: false,
          reducedSound: false,
        },
        true,
      ),
    ).toBe(true);
  });

  it('derives icon state text for review-needed and error cases', () => {
    expect(
      deriveExtensionIconState({
        pendingDrafts: 2,
        watching: false,
        offline: false,
        missingPermission: false,
        syncError: false,
      }),
    ).toBe('review-needed');

    expect(
      deriveExtensionIconState({
        pendingDrafts: 0,
        watching: false,
        offline: true,
        missingPermission: false,
        syncError: false,
      }),
    ).toBe('error-offline');
  });
});
