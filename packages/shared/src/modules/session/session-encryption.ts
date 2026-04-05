import { type Hex, hexToBytes, toHex } from 'viem';
import type { Address } from 'viem';
import type { EncryptedSessionMaterial } from '../../contracts/schema';
import { encryptedSessionMaterialSchema } from '../../contracts/schema';
import { nowIso } from '../../utils';

const SESSION_WRAPPING_CONTEXT = 'coop-session-wrap-v1';

function encodeBase64(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function decodeBase64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function deriveWrappingKey(secret: string, salt: Uint8Array) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 120_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function createSessionWrappingSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return encodeBase64(bytes);
}

export async function encryptSessionPrivateKey(input: {
  capabilityId: string;
  sessionAddress: Address;
  privateKey: Hex;
  wrappingSecret: string;
  wrappedAt?: string;
}): Promise<EncryptedSessionMaterial> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveWrappingKey(input.wrappingSecret, salt);
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    Uint8Array.from(hexToBytes(input.privateKey)),
  );

  return encryptedSessionMaterialSchema.parse({
    capabilityId: input.capabilityId,
    sessionAddress: input.sessionAddress,
    ciphertext: encodeBase64(new Uint8Array(ciphertext)),
    iv: encodeBase64(iv),
    salt: encodeBase64(salt),
    algorithm: 'aes-gcm',
    wrappedAt: input.wrappedAt ?? nowIso(),
    version: 1,
  });
}

export async function decryptSessionPrivateKey(input: {
  material: EncryptedSessionMaterial;
  wrappingSecret: string;
}): Promise<Hex> {
  const encoder = new TextEncoder();
  const salt = input.material.salt
    ? decodeBase64(input.material.salt)
    : encoder.encode(SESSION_WRAPPING_CONTEXT);
  const key = await deriveWrappingKey(input.wrappingSecret, salt);
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: decodeBase64(input.material.iv),
    },
    key,
    decodeBase64(input.material.ciphertext),
  );

  return toHex(new Uint8Array(decrypted));
}
