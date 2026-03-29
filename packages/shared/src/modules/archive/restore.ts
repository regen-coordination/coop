import {
  type ArchiveReceipt,
  type CoopSharedState,
  type TrustedNodeArchiveConfig,
  artifactSchema,
  coopSharedStateSchema,
} from '../../contracts/schema';
import { createId, nowIso } from '../../utils';
import { buildMemoryProfileSeed } from '../coop/pipeline';
import { createCoopDoc, createSyncRoomConfig, encodeCoopDoc } from '../coop/sync';
import { createUnavailableOnchainState } from '../onchain/onchain';
import type { CoopDexie } from '../storage/db';
import { retrieveArchiveBundle } from './archive';

function assertArchiveRestoreVerification(input: {
  receipt: ArchiveReceipt;
  retrieval: Awaited<ReturnType<typeof retrieveArchiveBundle>>;
}) {
  const issues = [...input.retrieval.verification.receiptIssues];

  if (input.receipt.delegation?.mode === 'live' && !input.retrieval.verified) {
    issues.unshift('Archive payload could not be verified against the stored receipt.');
  }

  if (issues.length > 0) {
    throw new Error(`Archive restore verification failed: ${issues.join(' ')}`);
  }
}

/**
 * Write a validated CoopSharedState into Dexie as an encoded Yjs document.
 */
async function writeStateToDexie(state: CoopSharedState, db: CoopDexie): Promise<void> {
  const doc = createCoopDoc(state);
  await db.coopDocs.put({
    id: state.profile.id,
    encodedState: encodeCoopDoc(doc),
    updatedAt: nowIso(),
  });
}

/**
 * Reconstruct a CoopSharedState from a snapshot archive payload.
 *
 * The bundle format stores coop profile under `payload.coop`, while
 * CoopSharedState uses `profile`. This maps between the two and fills
 * defaults for fields that may be missing in older snapshots.
 */
function reconstructStateFromSnapshotPayload(payload: Record<string, unknown>): CoopSharedState {
  const fullState = coopSharedStateSchema.safeParse(payload);
  if (fullState.success) {
    return fullState.data;
  }

  const coopProfile = payload.coop as Record<string, unknown> | undefined;
  const coopId = (coopProfile?.id as string) ?? createId('coop');

  // Build default members if missing (schema requires min 1)
  const members = payload.members ?? [
    {
      id: createId('member'),
      displayName: 'Restored Member',
      role: 'creator',
      authMode: 'passkey',
      address: '0x0000000000000000000000000000000000000001',
      joinedAt: nowIso(),
      identityWarning: 'This member was reconstructed during archive restore.',
    },
  ];

  // Build default setupInsights if missing (schema requires 4 lenses)
  const setupInsights = payload.setupInsights ?? {
    summary: 'Restored from archive.',
    crossCuttingPainPoints: [],
    crossCuttingOpportunities: [],
    lenses: [
      {
        lens: 'capital-formation',
        currentState: 'Restored.',
        painPoints: 'Unknown.',
        improvements: 'Review.',
      },
      {
        lens: 'impact-reporting',
        currentState: 'Restored.',
        painPoints: 'Unknown.',
        improvements: 'Review.',
      },
      {
        lens: 'governance-coordination',
        currentState: 'Restored.',
        painPoints: 'Unknown.',
        improvements: 'Review.',
      },
      {
        lens: 'knowledge-garden-resources',
        currentState: 'Restored.',
        painPoints: 'Unknown.',
        improvements: 'Review.',
      },
    ],
  };

  return coopSharedStateSchema.parse({
    profile: coopProfile,
    soul: payload.soul,
    rituals: payload.rituals,
    members,
    memberAccounts: payload.memberAccounts ?? [],
    artifacts: payload.artifacts ?? [],
    reviewBoard: payload.reviewBoard ?? [],
    archiveReceipts: payload.archiveReceipts ?? [],
    setupInsights,
    memoryProfile: payload.memoryProfile ?? buildMemoryProfileSeed(),
    syncRoom: payload.syncRoom ?? createSyncRoomConfig(coopId),
    onchainState:
      payload.onchainState ??
      createUnavailableOnchainState({ safeAddressSeed: `restore:${coopId}` }),
    invites: payload.invites ?? [],
    memberCommitments: payload.memberCommitments ?? [],
    greenGoods: payload.greenGoods,
  });
}

/**
 * Restore a coop from an archive receipt by fetching from the IPFS gateway,
 * validating the schema, and writing into local state.
 */
export async function restoreFromArchive(
  receipt: ArchiveReceipt,
  db: CoopDexie,
  archiveConfig?: TrustedNodeArchiveConfig,
): Promise<{ state: CoopSharedState; coopId: string }> {
  const retrieval = await retrieveArchiveBundle(receipt, archiveConfig);
  assertArchiveRestoreVerification({ receipt, retrieval });
  const { payload } = retrieval;

  // The bundle wraps the actual data in a `payload` property
  const innerPayload = (payload.payload as Record<string, unknown>) ?? payload;

  const state = reconstructStateFromSnapshotPayload(innerPayload);

  await writeStateToDexie(state, db);

  return { state, coopId: state.profile.id };
}

/**
 * Restore from a previously exported snapshot JSON string.
 * Accepts the output of exportCoopSnapshotJson().
 */
export async function restoreFromExportedSnapshot(
  json: string,
  db: CoopDexie,
): Promise<{ state: CoopSharedState; coopId: string }> {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(json) as Record<string, unknown>;
  } catch {
    throw new Error('Invalid JSON: could not parse snapshot export.');
  }

  if (parsed.type !== 'coop-snapshot') {
    throw new Error(`Expected type "coop-snapshot", got "${String(parsed.type)}".`);
  }

  if (!parsed.snapshot || typeof parsed.snapshot !== 'object') {
    throw new Error('Exported snapshot is missing the "snapshot" field.');
  }

  const state = coopSharedStateSchema.parse(parsed.snapshot);

  await writeStateToDexie(state, db);

  return { state, coopId: state.profile.id };
}

/**
 * Validate that a fetched archive payload can be restored.
 * Returns the parsed state without writing it.
 */
export async function validateArchivePayload(
  payload: Record<string, unknown>,
  scope: 'artifact' | 'snapshot',
): Promise<{ valid: boolean; state?: CoopSharedState; errors?: string[] }> {
  if (scope === 'artifact') {
    const artifacts = payload.artifacts;
    if (!Array.isArray(artifacts)) {
      return { valid: false, errors: ['Payload is missing a valid "artifacts" array.'] };
    }
    const parseErrors: string[] = [];
    for (let i = 0; i < artifacts.length; i++) {
      const result = artifactSchema.safeParse(artifacts[i]);
      if (!result.success) {
        parseErrors.push(`Artifact at index ${i}: ${result.error.message}`);
      }
    }
    if (parseErrors.length > 0) {
      return { valid: false, errors: parseErrors };
    }
    return { valid: true };
  }

  // snapshot scope
  try {
    const state = reconstructStateFromSnapshotPayload(payload);
    return { valid: true, state };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { valid: false, errors: [message] };
  }
}
