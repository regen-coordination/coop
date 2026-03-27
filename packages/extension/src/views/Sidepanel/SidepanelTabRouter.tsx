import { ErrorBoundary } from '../ErrorBoundary';
import type { SidepanelOrchestration } from './hooks/useSidepanelOrchestration';
import type { SidepanelTab } from './sidepanel-tabs';
import { ChickensTab, CoopsTab, NestTab, RoostTab } from './tabs/index';

export interface SidepanelTabRouterProps {
  panelTab: SidepanelTab;
  orchestration: SidepanelOrchestration;
}

export function SidepanelTabRouter({ panelTab, orchestration }: SidepanelTabRouterProps) {
  const {
    dashboard,
    agentDashboard,
    activeCoop,
    activeMember,
    runtimeConfig,
    authSession,
    soundPreferences,
    inferenceState,
    browserUxCapabilities,
    configuredReceiverAppUrl,
    stealthMetaAddress,
    visibleDrafts,
    visibleReceiverPairings,
    activeReceiverPairing,
    activeReceiverPairingStatus,
    activeReceiverProtocolLink,
    receiverIntake,
    archiveStory,
    archiveReceipts,
    refreshableArchiveReceipts,
    boardUrl,
    actionPolicies,
    inviteResult,
    coopForm,
    draftEditor,
    tabCapture,
    handleProvisionMemberOnchainAccount,
    handleSubmitGreenGoodsWorkSubmission,
    createInvite,
    revokeInvite,
    updateCoopProfile,
    handleLeaveCoop,
    createReceiverPairing,
    selectReceiverPairing,
    selectActiveCoop,
    copyText,
    archiveSnapshot,
    archiveArtifact,
    toggleArtifactArchiveWorthiness,
    archiveLatestArtifact,
    toggleAnchorMode,
    refreshArchiveStatus,
    exportSnapshot,
    exportLatestArtifact,
    exportLatestReceipt,
    handleAnchorOnChain,
    handleFvmRegister,
    handleRunAgentCycle,
    handleApproveAgentPlan,
    handleRejectAgentPlan,
    handleRetrySkillRun,
    handleToggleSkillAutoRun,
    handleSetPolicy,
    handleProposeAction,
    handleApproveAction,
    handleRejectAction,
    handleExecuteAction,
    handleIssuePermit,
    handleRevokePermit,
    handleExecuteWithPermit,
    handleIssueSessionCapability,
    handleRotateSessionCapability,
    handleRevokeSessionCapability,
    handleQueueGreenGoodsWorkApproval,
    handleQueueGreenGoodsAssessment,
    handleQueueGreenGoodsGapAdminSync,
    handleQueueGreenGoodsMemberSync,
    updateSound,
    testSound,
    toggleLocalInferenceOptIn,
    clearSensitiveLocalData,
    updateUiPreferences,
    loadDashboard,
    setMessage,
  } = orchestration;

  switch (panelTab) {
    case 'roost':
      return (
        <ErrorBoundary>
          <RoostTab
            activeCoop={activeCoop}
            activeMember={activeMember}
            allCoops={dashboard?.coops ?? []}
            selectActiveCoop={selectActiveCoop}
            greenGoodsActionQueue={dashboard?.operator.policyActionQueue ?? []}
            onProvisionMemberOnchainAccount={handleProvisionMemberOnchainAccount}
            onSubmitGreenGoodsWorkSubmission={handleSubmitGreenGoodsWorkSubmission}
          />
        </ErrorBoundary>
      );

    case 'chickens':
      return (
        <ErrorBoundary>
          <ChickensTab
            dashboard={dashboard}
            visibleDrafts={visibleDrafts}
            draftEditor={draftEditor}
            inferenceState={inferenceState}
            runtimeConfig={runtimeConfig}
            tabCapture={tabCapture}
          />
        </ErrorBoundary>
      );

    case 'coops':
      return (
        <ErrorBoundary>
          <CoopsTab
            dashboard={dashboard}
            activeCoop={activeCoop}
            allCoops={dashboard?.coops ?? []}
            currentMemberId={activeMember?.id}
            archiveStory={archiveStory}
            archiveReceipts={archiveReceipts}
            refreshableArchiveReceipts={refreshableArchiveReceipts}
            runtimeConfig={runtimeConfig}
            boardUrl={boardUrl}
            archiveSnapshot={archiveSnapshot}
            exportLatestReceipt={exportLatestReceipt}
            refreshArchiveStatus={refreshArchiveStatus}
            archiveArtifact={archiveArtifact}
            toggleArtifactArchiveWorthiness={toggleArtifactArchiveWorthiness}
            onAnchorOnChain={handleAnchorOnChain}
            onFvmRegister={handleFvmRegister}
            selectActiveCoop={selectActiveCoop}
          />
        </ErrorBoundary>
      );

    case 'nest':
      return (
        <ErrorBoundary>
          <NestTab orchestration={orchestration} />
        </ErrorBoundary>
      );
  }
}
