const ONNX_WASM_ASSET_PATH = 'assets/ort-wasm-simd-threaded.jsep.wasm';

export function resolveExtensionAssetUrl(assetPath: string) {
  if (/^[a-z]+:/iu.test(assetPath)) {
    return assetPath;
  }

  const normalized = assetPath.replace(/^\/+/u, '');
  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
    return chrome.runtime.getURL(normalized);
  }

  if (typeof self !== 'undefined' && 'location' in self) {
    return new URL(normalized, self.location.href).href;
  }

  return normalized;
}

export function resolveOnnxRuntimeWasmPaths() {
  return {
    wasm: resolveExtensionAssetUrl(ONNX_WASM_ASSET_PATH),
  };
}
