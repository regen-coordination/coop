// Barrel export for views/shared utilities and components.

export {
  preflightManualCapture,
  preflightActiveTabCapture,
  preflightScreenshotCapture,
  getActiveTabCaptureAccessStatus,
  requestBroadHostAccess,
  hasBroadHostAccess,
  isStandardWebUrl,
  STANDARD_HOST_ORIGINS,
  toOriginPattern,
} from './capture-preflight';

export {
  passkeyTrustLabel,
  passkeyTrustDetail,
  purposeHelpDetail,
  purposeCreateHelperText,
} from './coop-copy';

export {
  resolvePreviewCardImageUrl,
  selectActiveCoop,
  selectActiveMember,
  selectVisibleDrafts,
  selectReadyDrafts,
  selectAggregateVisibleDrafts,
  selectAggregateReadyDrafts,
  selectRecentArtifacts,
  selectAggregateArtifacts,
} from './dashboard-selectors';

export { buildInviteShareContent } from './invite-share';
export type { InviteShareInput, InviteShareContent } from './invite-share';

export { InviteShareComposer } from './InviteShareComposer';
export type { InviteShareComposerProps } from './InviteShareComposer';

export { NotificationBanner } from './NotificationBanner';

export { Tooltip } from './Tooltip';

export { useCaptureActions } from './useCaptureActions';

export { useCoopActions } from './useCoopActions';

export { useCoopTheme } from './useCoopTheme';

export { useQuickDraftActions } from './useQuickDraftActions';
