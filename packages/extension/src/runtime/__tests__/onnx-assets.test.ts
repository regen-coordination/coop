import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveExtensionAssetUrl, resolveOnnxRuntimeWasmPaths } from '../onnx-assets';

describe('onnx runtime asset resolution', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'chrome');
    vi.restoreAllMocks();
  });

  it('resolves extension-local asset URLs through chrome.runtime.getURL', () => {
    Object.defineProperty(globalThis, 'chrome', {
      configurable: true,
      value: {
        runtime: {
          getURL: vi.fn((assetPath: string) => `chrome-extension://coop/${assetPath}`),
        },
      },
    });

    expect(resolveExtensionAssetUrl('/assets/ort-wasm-simd-threaded.jsep.wasm')).toBe(
      'chrome-extension://coop/assets/ort-wasm-simd-threaded.jsep.wasm',
    );
    expect(resolveOnnxRuntimeWasmPaths()).toEqual({
      wasm: 'chrome-extension://coop/assets/ort-wasm-simd-threaded.jsep.wasm',
    });
  });

  it('falls back to the current worker location without introducing http or https URLs', () => {
    const previousSelf = globalThis.self;

    Object.defineProperty(globalThis, 'self', {
      configurable: true,
      value: {
        location: new URL('chrome-extension://coop/background.js'),
      },
    });

    expect(resolveOnnxRuntimeWasmPaths()).toEqual({
      wasm: 'chrome-extension://coop/assets/ort-wasm-simd-threaded.jsep.wasm',
    });

    Object.defineProperty(globalThis, 'self', {
      configurable: true,
      value: previousSelf,
    });
  });
});
