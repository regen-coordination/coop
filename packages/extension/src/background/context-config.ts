import { defaultSignalingUrls } from '@coop/shared';
import {
  isLocalEnhancementEnabled,
  parseConfiguredSignalingUrls,
  resolveConfiguredArchiveMode,
  resolveConfiguredChain,
  resolveConfiguredFvmChain,
  resolveConfiguredFvmOperatorKey,
  resolveConfiguredFvmRegistryAddress,
  resolveConfiguredOnchainMode,
  resolveConfiguredPrivacyMode,
  resolveConfiguredProviderMode,
  resolveConfiguredSessionMode,
  resolveReceiverAppUrl,
  resolveTrustedNodeArchiveBootstrapConfig,
} from '../runtime/config';

// ---- Environment-Resolved Configuration Constants ----

export const configuredArchiveMode = resolveConfiguredArchiveMode(
  import.meta.env.VITE_COOP_ARCHIVE_MODE,
);
export const configuredChain = resolveConfiguredChain(import.meta.env.VITE_COOP_CHAIN);
export const configuredOnchainMode = resolveConfiguredOnchainMode(
  import.meta.env.VITE_COOP_ONCHAIN_MODE,
  import.meta.env.VITE_PIMLICO_API_KEY,
);
export const configuredSessionMode = resolveConfiguredSessionMode(
  import.meta.env.VITE_COOP_SESSION_MODE,
);
export const configuredProviderMode = resolveConfiguredProviderMode(
  import.meta.env.VITE_COOP_PROVIDER_MODE,
);
export const configuredPrivacyMode = resolveConfiguredPrivacyMode(
  import.meta.env.VITE_COOP_PRIVACY_MODE,
);
export const configuredSignalingUrls =
  parseConfiguredSignalingUrls(import.meta.env.VITE_COOP_SIGNALING_URLS) ?? defaultSignalingUrls;
export const configuredWebsocketSyncUrl: string | undefined =
  typeof import.meta.env.VITE_COOP_WEBSOCKET_SYNC_URL === 'string' &&
  import.meta.env.VITE_COOP_WEBSOCKET_SYNC_URL.length > 0
    ? import.meta.env.VITE_COOP_WEBSOCKET_SYNC_URL
    : undefined;
export const configuredPimlicoApiKey =
  typeof import.meta.env.VITE_PIMLICO_API_KEY === 'string' &&
  import.meta.env.VITE_PIMLICO_API_KEY.length > 0
    ? import.meta.env.VITE_PIMLICO_API_KEY
    : undefined;
export const configuredGreenGoodsWorkSchemaUid =
  typeof import.meta.env.VITE_COOP_GREEN_GOODS_WORK_SCHEMA_UID === 'string' &&
  /^0x[a-fA-F0-9]{64}$/.test(import.meta.env.VITE_COOP_GREEN_GOODS_WORK_SCHEMA_UID)
    ? (import.meta.env.VITE_COOP_GREEN_GOODS_WORK_SCHEMA_UID as `0x${string}`)
    : undefined;
export const configuredReceiverAppUrl = resolveReceiverAppUrl(
  import.meta.env.VITE_COOP_RECEIVER_APP_URL,
);
export const configuredFvmChain = resolveConfiguredFvmChain(import.meta.env.VITE_COOP_FVM_CHAIN);
export const configuredFvmRegistryAddress = resolveConfiguredFvmRegistryAddress(
  import.meta.env.VITE_COOP_FVM_REGISTRY_ADDRESS,
);
export const configuredFvmOperatorKey = resolveConfiguredFvmOperatorKey(
  import.meta.env.VITE_COOP_FVM_OPERATOR_KEY,
);
export const prefersLocalEnhancement = isLocalEnhancementEnabled(
  import.meta.env.VITE_COOP_LOCAL_ENHANCEMENT,
);
export const trustedNodeArchiveBootstrap = (() => {
  try {
    return {
      config: resolveTrustedNodeArchiveBootstrapConfig(
        import.meta.env as Record<string, string | undefined>,
      ),
      error: undefined,
    } as const;
  } catch (error) {
    return {
      config: null,
      error:
        error instanceof Error
          ? error.message
          : 'Trusted-node archive bootstrap config could not be parsed.',
    } as const;
  }
})();
export const trustedNodeArchiveConfigMissingError =
  'Live Storacha archive mode is enabled, but this anchor node has no trusted-node archive delegation config.';
