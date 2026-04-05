// Re-export only the public API — internal helpers (GREEN_GOODS_ACTION_SELECTORS,
// toUnixSeconds, buildActiveSessionCapabilityStatusDetail) are kept module-private.

export {
  SESSION_CAPABLE_ACTION_CLASSES,
  isSessionCapableActionClass,
  parseSessionCapableActionClass,
} from './session-constants';

export {
  computeSessionCapabilityStatus,
  createSessionCapability,
  createSessionCapabilityLogEntry,
  createSessionSignerMaterial,
  formatSessionCapabilityFailureReason,
  formatSessionCapabilityStatusLabel,
  incrementSessionCapabilityUsage,
  refreshSessionCapabilityStatus,
  revokeSessionCapability,
  rotateSessionCapability,
} from './session-capability';
export type { RefreshSessionCapabilityStatusOptions } from './session-capability';

export {
  buildEnableSessionExecution,
  buildRemoveSessionExecution,
  buildSessionModuleAccount,
  buildSmartSession,
  checkSessionCapabilityEnabled,
  getBundleTypedAuthorization,
  getSessionCapabilityUseStubSignature,
  getSmartSessionsValidatorNonceKey,
  signSessionCapabilityUserOperation,
  wrapUseSessionSignature,
} from './session-smart-modules';

export { validateSessionCapabilityForBundle } from './session-validation';
export type { SessionCapabilityValidationResult } from './session-validation';

export {
  createSessionWrappingSecret,
  decryptSessionPrivateKey,
  encryptSessionPrivateKey,
} from './session-encryption';
