import {
  type ArchiveBlobEncryption,
  type ArchiveBundle,
  type ArchiveEncryptedEnvelope,
  type ArchiveReceipt,
  type TrustedNodeArchiveConfig,
  archiveEncryptedEnvelopeSchema,
} from '../../contracts/schema';
import { base64ToBytes, bytesToBase64 } from '../../utils';

export const ARCHIVE_ENCRYPTION_ALGORITHM = 'aes-gcm' as const;
export const ARCHIVE_KEY_DERIVATION = 'coop-archive-config-v1' as const;

type ArchiveAadInput =
  | {
      kind: 'payload';
      targetCoopId: string;
      scope: ArchiveBundle['scope'];
      bundleId: string;
    }
  | {
      kind: 'blob';
      targetCoopId: string;
      blobId: string;
    };

function encodeArchiveAad(input: ArchiveAadInput) {
  return new TextEncoder().encode(JSON.stringify(input));
}

async function deriveArchiveCipherKey(config: TrustedNodeArchiveConfig, targetCoopId: string) {
  const keyMaterial = JSON.stringify({
    version: 1,
    keyDerivation: ARCHIVE_KEY_DERIVATION,
    targetCoopId,
    spaceDid: config.spaceDid,
    delegationIssuer: config.delegationIssuer,
    gatewayBaseUrl: config.gatewayBaseUrl,
    spaceDelegation: config.spaceDelegation,
    proofs: config.proofs,
    agentPrivateKey: config.agentPrivateKey ?? '',
  });
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(keyMaterial) as BufferSource,
  );

  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptArchiveBlobBytes(input: {
  bytes: Uint8Array;
  targetCoopId: string;
  blobId: string;
  config: TrustedNodeArchiveConfig;
}): Promise<{ ciphertext: Uint8Array; encryption: ArchiveBlobEncryption }> {
  const key = await deriveArchiveCipherKey(input.config, input.targetCoopId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: encodeArchiveAad({
        kind: 'blob',
        targetCoopId: input.targetCoopId,
        blobId: input.blobId,
      }) as BufferSource,
    },
    key,
    input.bytes as BufferSource,
  );

  return {
    ciphertext: new Uint8Array(ciphertext),
    encryption: {
      algorithm: ARCHIVE_ENCRYPTION_ALGORITHM,
      keyDerivation: ARCHIVE_KEY_DERIVATION,
      iv: bytesToBase64(iv),
      ciphertextByteSize: ciphertext.byteLength,
    },
  };
}

export async function decryptArchiveBlobBytes(input: {
  bytes: Uint8Array;
  targetCoopId: string;
  blobId: string;
  config: TrustedNodeArchiveConfig;
  encryption: ArchiveBlobEncryption;
}) {
  const key = await deriveArchiveCipherKey(input.config, input.targetCoopId);

  try {
    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: base64ToBytes(input.encryption.iv),
        additionalData: encodeArchiveAad({
          kind: 'blob',
          targetCoopId: input.targetCoopId,
          blobId: input.blobId,
        }) as BufferSource,
      },
      key,
      input.bytes as BufferSource,
    );
    return new Uint8Array(plaintext);
  } catch {
    throw new Error(
      `Archive blob ${input.blobId} could not be decrypted with the current local archive secrets.`,
    );
  }
}

export async function encryptArchivePayloadEnvelope(input: {
  bundle: ArchiveBundle;
  payload: Record<string, unknown>;
  config: TrustedNodeArchiveConfig;
}): Promise<ArchiveEncryptedEnvelope> {
  const key = await deriveArchiveCipherKey(input.config, input.bundle.targetCoopId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(input.payload));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: encodeArchiveAad({
        kind: 'payload',
        targetCoopId: input.bundle.targetCoopId,
        scope: input.bundle.scope,
        bundleId: input.bundle.id,
      }) as BufferSource,
    },
    key,
    plaintext as BufferSource,
  );

  return archiveEncryptedEnvelopeSchema.parse({
    type: 'coop-archive-envelope',
    schemaVersion: 1,
    bundleId: input.bundle.id,
    scope: input.bundle.scope,
    targetCoopId: input.bundle.targetCoopId,
    payloadEncoding: 'json',
    algorithm: ARCHIVE_ENCRYPTION_ALGORITHM,
    keyDerivation: ARCHIVE_KEY_DERIVATION,
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  });
}

export function isArchiveEncryptedEnvelope(
  value: Record<string, unknown> | null | undefined,
): value is ArchiveEncryptedEnvelope {
  return value?.type === 'coop-archive-envelope';
}

export async function decryptArchivePayloadEnvelope(input: {
  envelope: Record<string, unknown>;
  receipt: Pick<ArchiveReceipt, 'bundleReference' | 'scope' | 'targetCoopId'>;
  config: TrustedNodeArchiveConfig;
}) {
  const envelope = archiveEncryptedEnvelopeSchema.parse(input.envelope);
  if (
    envelope.bundleId !== input.receipt.bundleReference ||
    envelope.scope !== input.receipt.scope ||
    envelope.targetCoopId !== input.receipt.targetCoopId
  ) {
    throw new Error('Encrypted archive envelope does not match the stored receipt metadata.');
  }

  const key = await deriveArchiveCipherKey(input.config, input.receipt.targetCoopId);

  try {
    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: base64ToBytes(envelope.iv),
        additionalData: encodeArchiveAad({
          kind: 'payload',
          targetCoopId: input.receipt.targetCoopId,
          scope: input.receipt.scope,
          bundleId: input.receipt.bundleReference,
        }) as BufferSource,
      },
      key,
      base64ToBytes(envelope.ciphertext) as BufferSource,
    );
    const parsed = JSON.parse(new TextDecoder().decode(plaintext)) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Archive payload did not decrypt into an object.');
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'Archive payload did not decrypt into an object.'
    ) {
      throw error;
    }
    throw new Error(
      'Encrypted archive payload could not be decrypted with the current local archive secrets.',
    );
  }
}
