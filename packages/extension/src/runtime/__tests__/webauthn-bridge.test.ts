import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  registerWebAuthnCredentialBridge,
  requestWebAuthnCredentialViaExtensionBridge,
} from '../webauthn-bridge';

const WEBAUTHN_BRIDGE_MESSAGE = 'coop-internal-request-webauthn-credential';

type RuntimeMessageListener = (
  message: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void,
) => unknown;

describe('webauthn bridge', () => {
  let addListener: ReturnType<typeof vi.fn>;
  let sendMessage: ReturnType<typeof vi.fn>;
  let listener: RuntimeMessageListener | undefined;

  beforeEach(() => {
    addListener = vi.fn((nextListener: RuntimeMessageListener) => {
      listener = nextListener;
    });
    sendMessage = vi.fn();

    Object.defineProperty(globalThis, 'chrome', {
      configurable: true,
      value: {
        runtime: {
          id: 'coop-extension-id',
          addListener,
          sendMessage,
          onMessage: {
            addListener,
          },
        },
      },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'chrome');
    Reflect.deleteProperty(navigator, 'credentials');
  });

  it('serializes request options and deserializes returned assertion credentials', async () => {
    sendMessage.mockResolvedValue({
      ok: true,
      data: {
        id: 'credential-1',
        response: {
          authenticatorData: [1, 2, 3],
          clientDataJSON: [4, 5],
          signature: [6, 7, 8],
          userHandle: [9, 10],
        },
      },
    });

    const credential = (await requestWebAuthnCredentialViaExtensionBridge({
      publicKey: {
        challenge: Uint8Array.from([11, 12, 13]),
        allowCredentials: [
          {
            type: 'public-key',
            id: Uint8Array.from([21, 22, 23]),
            transports: ['internal'],
          },
        ],
        timeout: 60_000,
      },
    })) as PublicKeyCredential;

    expect(sendMessage).toHaveBeenCalledWith({
      type: WEBAUTHN_BRIDGE_MESSAGE,
      payload: {
        publicKey: {
          challenge: [11, 12, 13],
          allowCredentials: [
            {
              type: 'public-key',
              id: [21, 22, 23],
              transports: ['internal'],
            },
          ],
          timeout: 60_000,
        },
      },
    });
    expect(credential.id).toBe('credential-1');
    expect(Array.from(new Uint8Array(credential.response.authenticatorData))).toEqual([1, 2, 3]);
    expect(Array.from(new Uint8Array(credential.response.clientDataJSON))).toEqual([4, 5]);
    expect(Array.from(new Uint8Array(credential.response.signature))).toEqual([6, 7, 8]);
    expect(Array.from(new Uint8Array(credential.response.userHandle as ArrayBuffer))).toEqual([
      9, 10,
    ]);
  });

  it('returns null when the extension reports no credential', async () => {
    sendMessage.mockResolvedValue({
      ok: true,
      data: null,
    });

    await expect(requestWebAuthnCredentialViaExtensionBridge()).resolves.toBeNull();
  });

  it('propagates runtime bridge failures with the original error text', async () => {
    sendMessage.mockRejectedValue(new Error('Passkey confirmation requires an open Coop popup.'));

    await expect(requestWebAuthnCredentialViaExtensionBridge()).rejects.toThrow(
      'Passkey confirmation requires an open Coop popup.',
    );
  });

  it('rejects unauthorized senders before calling navigator.credentials.get', async () => {
    const getCredential = vi.fn();
    Object.defineProperty(navigator, 'credentials', {
      configurable: true,
      value: {
        get: getCredential,
      },
    });

    registerWebAuthnCredentialBridge();
    expect(listener).toBeDefined();

    const sendResponse = vi.fn();
    const returned = listener?.(
      { type: WEBAUTHN_BRIDGE_MESSAGE },
      { id: 'foreign-extension-id' } as chrome.runtime.MessageSender,
      sendResponse,
    );

    expect(returned).toBeUndefined();
    expect(getCredential).not.toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalledWith({
      ok: false,
      error: 'Unauthorized WebAuthn bridge sender.',
    });
  });

  it('deserializes incoming request payloads for navigator.credentials.get and serializes the response', async () => {
    const getCredential = vi.fn().mockResolvedValue({
      id: 'credential-2',
      response: {
        authenticatorData: Uint8Array.from([31, 32]).buffer,
        clientDataJSON: Uint8Array.from([33, 34]).buffer,
        signature: Uint8Array.from([35]).buffer,
        userHandle: Uint8Array.from([36]).buffer,
      },
    } satisfies Partial<AuthenticatorAssertionResponse> & { id: string });

    Object.defineProperty(navigator, 'credentials', {
      configurable: true,
      value: {
        get: getCredential,
      },
    });

    registerWebAuthnCredentialBridge();
    expect(listener).toBeDefined();

    const sendResponse = vi.fn();
    const returned = listener?.(
      {
        type: WEBAUTHN_BRIDGE_MESSAGE,
        payload: {
          publicKey: {
            challenge: [41, 42],
            allowCredentials: [
              {
                type: 'public-key',
                id: [43, 44],
              },
            ],
            timeout: 90_000,
          },
        },
      },
      { id: 'coop-extension-id' } as chrome.runtime.MessageSender,
      sendResponse,
    );

    expect(returned).toBe(true);
    await Promise.resolve();

    expect(getCredential).toHaveBeenCalledWith({
      publicKey: {
        challenge: Uint8Array.from([41, 42]),
        allowCredentials: [
          {
            type: 'public-key',
            id: Uint8Array.from([43, 44]),
          },
        ],
        timeout: 90_000,
      },
    });
    expect(sendResponse).toHaveBeenCalledWith({
      ok: true,
      data: {
        id: 'credential-2',
        response: {
          authenticatorData: [31, 32],
          clientDataJSON: [33, 34],
          signature: [35],
          userHandle: [36],
        },
      },
    });
  });

  it('surfaces navigator credential failures back through the listener response', async () => {
    Object.defineProperty(navigator, 'credentials', {
      configurable: true,
      value: {
        get: vi.fn().mockRejectedValue(new Error('The user dismissed the passkey prompt.')),
      },
    });

    registerWebAuthnCredentialBridge();
    expect(listener).toBeDefined();

    const sendResponse = vi.fn();
    listener?.(
      { type: WEBAUTHN_BRIDGE_MESSAGE },
      { id: 'coop-extension-id' } as chrome.runtime.MessageSender,
      sendResponse,
    );
    await Promise.resolve();

    expect(sendResponse).toHaveBeenCalledWith({
      ok: false,
      error: 'The user dismissed the passkey prompt.',
    });
  });
});
