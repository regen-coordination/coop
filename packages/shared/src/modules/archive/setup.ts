import * as StorachaClient from '@storacha/client';
import * as Ed25519 from '@ucanto/principal/ed25519';
import type { CoopArchiveConfig, CoopArchiveSecrets } from '../../contracts/schema';
import { bytesToBase64 } from '../../utils';

export interface ProvisionStorachaSpaceInput {
  email: string;
  coopName: string;
  signal?: AbortSignal;
}

export interface ProvisionStorachaSpaceResult {
  publicConfig: CoopArchiveConfig;
  secrets: Omit<CoopArchiveSecrets, 'coopId'>;
}

async function encodeDelegation(delegation: { archive(): unknown }) {
  const archived = (await delegation.archive()) as
    | { ok: Uint8Array; error?: undefined }
    | { ok?: undefined; error: unknown };

  if (!('ok' in archived) || !archived.ok) {
    throw archived.error instanceof Error
      ? archived.error
      : new Error('Could not archive space delegation.');
  }

  return bytesToBase64(archived.ok);
}

export async function provisionStorachaSpace(
  input: ProvisionStorachaSpaceInput,
): Promise<ProvisionStorachaSpaceResult> {
  // 1. Create client
  const client = await StorachaClient.create();

  // 2. Login with email (sends verification email, waits for confirmation)
  const account = await client.login(input.email as `${string}@${string}`, {
    signal: input.signal,
  });

  // 3. Create space (provisioned with the account for recovery)
  const space = await client.createSpace(`coop-${input.coopName}`, {
    account,
  });

  // 4. Extract credentials
  return extractClientCredentials(client, space, input.coopName);
}

export async function extractClientCredentials(
  client: Awaited<ReturnType<typeof StorachaClient.create>>,
  space: Awaited<ReturnType<Awaited<ReturnType<typeof StorachaClient.create>>['createSpace']>>,
  _coopName: string,
): Promise<ProvisionStorachaSpaceResult> {
  const spaceDid = space.did();
  const agentDid = client.did();

  // FRAGILE: Accesses @storacha/client private `_agent.issuer` via double type
  // assertion. No public API exists for retrieving the agent signer as of
  // @storacha/client@2.1.x. If this breaks after a version bump, check whether
  // the library has added a public accessor. Pin the dependency until verified.
  const agentSigner = (client as unknown as { _agent: { issuer: { encode(): Uint8Array } } })._agent
    .issuer;
  const agentKeyBytes = Ed25519.encode(agentSigner as Parameters<typeof Ed25519.encode>[0]);
  const agentPrivateKey = bytesToBase64(new Uint8Array(agentKeyBytes));

  // Create a delegation from the space to the agent so the agent can operate
  // on the space. This mirrors how issueArchiveDelegation later rehydrates.
  const authorization = await space.createAuthorization({ did: () => agentDid } as Parameters<
    typeof space.createAuthorization
  >[0]);
  const spaceDelegation = await encodeDelegation(authorization);

  return {
    publicConfig: {
      spaceDid,
      delegationIssuer: agentDid,
      gatewayBaseUrl: 'https://storacha.link',
      allowsFilecoinInfo: true,
      expirationSeconds: 600,
    },
    secrets: {
      agentPrivateKey,
      spaceDelegation,
      proofs: [],
    },
  };
}
