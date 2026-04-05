import {
  type CoopSharedState,
  coopArchiveConfigSchema,
  nowIso,
  provisionStorachaSpace,
  removeCoopArchiveSecrets,
  setCoopArchiveSecrets,
  withArchiveWorthiness,
} from '@coop/shared';
import type { RuntimeActionResponse, RuntimeRequest } from '../../runtime/messages';
import { db, getCoops, saveState } from '../context';
import { refreshBadge } from '../dashboard';

export async function handleSetArtifactArchiveWorthiness(
  message: Extract<RuntimeRequest, { type: 'set-artifact-archive-worthy' }>,
) {
  const coops = await getCoops();
  const coop = coops.find((item) => item.profile.id === message.payload.coopId);
  if (!coop) {
    return { ok: false, error: 'Coop not found.' } satisfies RuntimeActionResponse;
  }

  const artifact = coop.artifacts.find((item) => item.id === message.payload.artifactId);
  if (!artifact) {
    return { ok: false, error: 'Artifact not found.' } satisfies RuntimeActionResponse;
  }

  const nextArtifact = withArchiveWorthiness(artifact, message.payload.archiveWorthy, nowIso());
  const nextState = {
    ...coop,
    artifacts: coop.artifacts.map((item) => (item.id === artifact.id ? nextArtifact : item)),
  } satisfies CoopSharedState;

  await saveState(nextState);
  await refreshBadge();

  return {
    ok: true,
    data: nextArtifact,
  } satisfies RuntimeActionResponse;
}

export async function handleProvisionArchiveSpace(
  payload: Extract<RuntimeRequest, { type: 'provision-archive-space' }>['payload'],
): Promise<RuntimeActionResponse> {
  const coops = await getCoops();
  const coop = coops.find((item) => item.profile.id === payload.coopId);
  if (!coop) {
    return { ok: false, error: 'Coop not found.' } satisfies RuntimeActionResponse;
  }

  try {
    const result = await provisionStorachaSpace({
      email: payload.email,
      coopName: payload.coopName,
    });

    // Store secrets locally (never synced)
    await setCoopArchiveSecrets(db, payload.coopId, {
      ...result.secrets,
      coopId: payload.coopId,
    });

    // Store public config in CRDT state (synced)
    const validatedConfig = coopArchiveConfigSchema.parse(result.publicConfig);
    const nextState = {
      ...coop,
      archiveConfig: validatedConfig,
    } satisfies CoopSharedState;
    await saveState(nextState);

    return {
      ok: true,
      data: { spaceDid: result.publicConfig.spaceDid },
    } satisfies RuntimeActionResponse;
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Space provisioning failed.';
    return {
      ok: false,
      error: detail,
    } satisfies RuntimeActionResponse;
  }
}

export async function handleSetCoopArchiveConfig(
  payload: Extract<RuntimeRequest, { type: 'set-coop-archive-config' }>['payload'],
): Promise<RuntimeActionResponse> {
  const coops = await getCoops();
  const coop = coops.find((item) => item.profile.id === payload.coopId);
  if (!coop) {
    return { ok: false, error: 'Coop not found.' } satisfies RuntimeActionResponse;
  }

  const validatedConfig = coopArchiveConfigSchema.parse(payload.publicConfig);
  const nextState = {
    ...coop,
    archiveConfig: validatedConfig,
  } satisfies CoopSharedState;
  await saveState(nextState);
  await setCoopArchiveSecrets(db, payload.coopId, {
    ...payload.secrets,
    coopId: payload.coopId,
    proofs: payload.secrets.proofs ?? [],
  });
  return { ok: true } satisfies RuntimeActionResponse;
}

export async function handleRemoveCoopArchiveConfig(
  payload: Extract<RuntimeRequest, { type: 'remove-coop-archive-config' }>['payload'],
): Promise<RuntimeActionResponse> {
  const coops = await getCoops();
  const coop = coops.find((item) => item.profile.id === payload.coopId);
  if (!coop) {
    return { ok: false, error: 'Coop not found.' } satisfies RuntimeActionResponse;
  }

  const nextState: CoopSharedState = { ...coop, archiveConfig: undefined };
  await saveState(nextState);
  await removeCoopArchiveSecrets(db, payload.coopId);
  return { ok: true } satisfies RuntimeActionResponse;
}
