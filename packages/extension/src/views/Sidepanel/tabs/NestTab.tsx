import type { CoopSharedState, KnowledgeSource } from '@coop/shared';
import { formatCoopSpaceTypeLabel, getCoopChainLabel } from '@coop/shared';
import { useCallback, useEffect, useState } from 'react';
import { sendRuntimeMessage } from '../../../runtime/messages';
import { PopupSubheader, type PopupSubheaderTag } from '../../Popup/PopupSubheader';
import { Tooltip } from '../../shared/Tooltip';
import { SidepanelSubheader } from '../SidepanelSubheader';
import { getAddressExplorerUrl, truncateAddress } from '../helpers';
import type { useCoopForm } from '../hooks/useCoopForm';
import type { SidepanelOrchestration } from '../hooks/useSidepanelOrchestration';
import { NestAgentSection } from './NestAgentSection';
import { NestArchiveSection, NestArchiveWizardSection } from './NestArchiveSection';
import { NestCreationForm } from './NestCreationForm';
import {
  NestProfileSection,
  NestRitualSection,
  NestSetupSection,
  NestSoulSection,
} from './NestEditSections';
import { NestInviteSection } from './NestInviteSection';
import { NestReceiverSection } from './NestReceiverSection';
import { NestSettingsSection } from './NestSettingsSection';
import { NestSourcesSection } from './NestSourcesSection';

// ---------------------------------------------------------------------------
// Shared hook return types
// ---------------------------------------------------------------------------

type CoopFormReturn = ReturnType<typeof useCoopForm>;

// ---------------------------------------------------------------------------
// Sub-tab type
// ---------------------------------------------------------------------------

export type NestSubTab = 'members' | 'agent' | 'settings' | 'sources';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface NestTabOrchestrationProps {
  orchestration: SidepanelOrchestration;
}

export type NestTabProps = NestTabOrchestrationProps;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NestTab({ orchestration }: NestTabOrchestrationProps) {
  const {
    dashboard,
    activeCoop,
    authSession,
    coopForm,
    runtimeConfig,
    stealthMetaAddress,
    receiverIntake,
    loadDashboard,
    updateCoopDetails,
    updateMeetingSettings,
    handleLeaveCoop,
    selectActiveCoop,
  } = orchestration;

  const allCoops = dashboard?.coops ?? [];
  const [nestSubTab, setNestSubTab] = useState<NestSubTab>('members');
  const [inviteControlsOpen, setInviteControlsOpen] = useState(false);
  const [inviteFocusRequest, setInviteFocusRequest] = useState(0);
  const [sources, setSources] = useState<KnowledgeSource[]>([]);

  // --- Knowledge sources ---
  const fetchSources = useCallback(async () => {
    if (!activeCoop) return;
    const result = await sendRuntimeMessage<KnowledgeSource[]>({
      type: 'list-knowledge-sources',
      payload: { coopId: activeCoop.profile.id },
    });
    if (result.ok && result.data) setSources(result.data);
  }, [activeCoop?.profile.id]);

  useEffect(() => {
    if (nestSubTab === 'sources') void fetchSources();
  }, [nestSubTab, fetchSources]);

  const handleAddSource = useCallback(
    async (sourceType: string, identifier: string, label: string) => {
      if (!activeCoop) return;
      await sendRuntimeMessage({
        type: 'add-knowledge-source',
        payload: { coopId: activeCoop.profile.id, sourceType, identifier, label },
      });
      void fetchSources();
    },
    [activeCoop?.profile.id, fetchSources],
  );

  const handleRemoveSource = useCallback(
    async (sourceId: string) => {
      await sendRuntimeMessage({ type: 'remove-knowledge-source', payload: { sourceId } });
      void fetchSources();
    },
    [fetchSources],
  );

  const handleToggleSource = useCallback(
    async (sourceId: string, active: boolean) => {
      await sendRuntimeMessage({
        type: 'toggle-knowledge-source',
        payload: { sourceId, active },
      });
      void fetchSources();
    },
    [fetchSources],
  );

  // Badge counts
  const receiverIntakeCount = receiverIntake.length;
  const pendingActionCount =
    dashboard?.operator?.policyActionQueue?.filter((b) => b.status === 'proposed').length ?? 0;

  // Build coop filter tags
  const coopTags: PopupSubheaderTag[] = allCoops.map((c) => ({
    id: c.profile.id,
    label: c.profile.name,
    active: c.profile.id === (activeCoop?.profile.id ?? allCoops[0]?.profile.id),
    onClick: () => selectActiveCoop(c.profile.id),
  }));

  return (
    <section className="stack">
      {coopTags.length > 0 || activeCoop ? (
        <SidepanelSubheader>
          <div className="sidepanel-action-row">
            {coopTags.length > 0 ? (
              <PopupSubheader ariaLabel="Filter by coop" tags={coopTags} />
            ) : null}

            {activeCoop ? (
              <>
                <Tooltip content="Refresh">
                  {({ targetProps }) => (
                    <button
                      {...targetProps}
                      className="popup-icon-button"
                      aria-label="Refresh"
                      onClick={() => void loadDashboard()}
                      type="button"
                    >
                      <svg
                        aria-hidden="true"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 2v6h-6" />
                        <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                        <path d="M3 22v-6h6" />
                        <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                      </svg>
                    </button>
                  )}
                </Tooltip>
                {nestSubTab === 'members' ? (
                  <Tooltip content="Open invite controls">
                    {({ targetProps }) => (
                      <button
                        {...targetProps}
                        className="popup-icon-button"
                        aria-label="Open invite controls"
                        onClick={() => {
                          setInviteControlsOpen(true);
                          setInviteFocusRequest((current) => current + 1);
                        }}
                        type="button"
                      >
                        <svg
                          aria-hidden="true"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <line x1="19" y1="8" x2="19" y2="14" />
                          <line x1="22" y1="11" x2="16" y2="11" />
                        </svg>
                      </button>
                    )}
                  </Tooltip>
                ) : null}
              </>
            ) : null}
          </div>

          {/* --- Sub-tab pill bar (only with active coop) --- */}
          {activeCoop ? (
            <nav className="nest-sub-tabs" aria-label="Nest sections">
              <button
                className={nestSubTab === 'members' ? 'is-active' : ''}
                onClick={() => setNestSubTab('members')}
                type="button"
              >
                Members
                {receiverIntakeCount > 0 ? (
                  <span className="nest-badge">
                    {receiverIntakeCount > 99 ? '99+' : receiverIntakeCount}
                  </span>
                ) : null}
              </button>
              <button
                className={nestSubTab === 'agent' ? 'is-active' : ''}
                onClick={() => setNestSubTab('agent')}
                type="button"
              >
                Agent
                {pendingActionCount > 0 ? (
                  <span className="nest-badge">
                    {pendingActionCount > 99 ? '99+' : pendingActionCount}
                  </span>
                ) : null}
              </button>
              <button
                className={nestSubTab === 'settings' ? 'is-active' : ''}
                onClick={() => setNestSubTab('settings')}
                type="button"
              >
                Settings
              </button>
              <button
                className={nestSubTab === 'sources' ? 'is-active' : ''}
                onClick={() => setNestSubTab('sources')}
                type="button"
              >
                Sources
              </button>
            </nav>
          ) : null}
        </SidepanelSubheader>
      ) : null}

      {/* --- Coop Creation / Join (only when no active coop) --- */}
      {!activeCoop ? <NestCreationForm coopForm={coopForm} /> : null}

      {/* Quick info: receiver intake count */}
      {activeCoop && receiverIntakeCount > 0 ? (
        <p className="helper-text">
          {receiverIntakeCount} pocket find{receiverIntakeCount !== 1 ? 's' : ''} waiting
        </p>
      ) : null}

      {/* ================================================================= */}
      {/* Members sub-tab                                                    */}
      {/* ================================================================= */}
      {nestSubTab === 'members' && activeCoop ? (
        <>
          {/* --- Coop profile & member list --- */}
          <details className="panel-card collapsible-card" open>
            <summary>
              <h2>{activeCoop.profile.name}</h2>
            </summary>
            <div className="collapsible-card__content stack">
              <div className="badge-row">
                <span className="badge">
                  {formatCoopSpaceTypeLabel(activeCoop.profile.spaceType ?? 'community')}
                </span>
              </div>
              <div className="detail-grid">
                <div>
                  <strong>Purpose</strong>
                  <p className="helper-text">{activeCoop.profile.purpose}</p>
                </div>
                <div>
                  <strong>Shared nest</strong>
                  <p className="helper-text">
                    <a
                      href={getAddressExplorerUrl(
                        activeCoop.onchainState.safeAddress,
                        activeCoop.onchainState.chainKey,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="source-link"
                    >
                      {truncateAddress(activeCoop.onchainState.safeAddress)}
                    </a>
                    <br />
                    {getCoopChainLabel(activeCoop.onchainState.chainKey)} ·{' '}
                    {activeCoop.onchainState.statusNote}
                  </p>
                </div>
              </div>
              <ul className="list-reset stack">
                {activeCoop.members.map((member) => {
                  const memberAccount = activeCoop.memberAccounts?.find(
                    (a) => a.memberId === member.id,
                  );
                  return (
                    <li className="member-row" key={member.id}>
                      <strong>{member.displayName}</strong>
                      <div className="helper-text">
                        {member.role} seat
                        {memberAccount?.accountAddress ? (
                          <>
                            {' · '}
                            <a
                              href={getAddressExplorerUrl(
                                memberAccount.accountAddress,
                                activeCoop.onchainState.chainKey,
                              )}
                              target="_blank"
                              rel="noreferrer"
                              className="source-link"
                            >
                              {truncateAddress(memberAccount.accountAddress)}
                            </a>{' '}
                            <span className="badge">{memberAccount.accountType}</span>
                          </>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {runtimeConfig?.privacyMode === 'on' && stealthMetaAddress && (
                <details className="card" style={{ marginTop: '0.75rem' }}>
                  <summary className="card-header" style={{ cursor: 'pointer' }}>
                    Private payment address
                  </summary>
                  <div className="card-body" style={{ padding: '0.75rem' }}>
                    <p className="hint" style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                      Share this address to receive payments privately. Each payment goes to a
                      unique, unlinkable stealth address.
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <code
                        className="mono"
                        style={{
                          flex: 1,
                          fontSize: '0.7rem',
                          wordBreak: 'break-all',
                          padding: '0.5rem',
                          background: 'var(--surface-1, #1a1a1a)',
                          borderRadius: '4px',
                        }}
                      >
                        {stealthMetaAddress}
                      </code>
                      <Tooltip content="Copy stealth address">
                        {({ targetProps }) => (
                          <button
                            {...targetProps}
                            className="btn-sm"
                            onClick={() => navigator.clipboard.writeText(stealthMetaAddress)}
                            type="button"
                          >
                            Copy
                          </button>
                        )}
                      </Tooltip>
                    </div>
                  </div>
                </details>
              )}
            </div>
          </details>

          {/* --- Edit Coop --- */}
          <NestProfileSection activeCoop={activeCoop} updateCoopDetails={updateCoopDetails} />
          <NestSoulSection activeCoop={activeCoop} updateCoopDetails={updateCoopDetails} />
          <NestRitualSection
            activeCoop={activeCoop}
            updateMeetingSettings={updateMeetingSettings}
          />
          <NestSetupSection activeCoop={activeCoop} updateCoopDetails={updateCoopDetails} />

          {/* --- Invite --- */}
          <NestInviteSection
            inviteResult={orchestration.inviteResult}
            createInvite={orchestration.createInvite}
            revokeInvite={orchestration.revokeInvite}
            revokeInviteType={orchestration.revokeInviteType}
            coopForm={orchestration.coopForm}
            activeCoop={activeCoop}
            currentMemberId={
              orchestration.authSession
                ? activeCoop.members.find(
                    (m) => m.address === orchestration.authSession?.primaryAddress,
                  )?.id
                : undefined
            }
            controlsOpen={inviteControlsOpen}
            focusRequest={inviteFocusRequest}
            onControlsOpenChange={setInviteControlsOpen}
          />

          {/* --- Receiver --- */}
          <NestReceiverSection
            createReceiverPairing={orchestration.createReceiverPairing}
            activeReceiverPairing={orchestration.activeReceiverPairing}
            activeReceiverPairingStatus={orchestration.activeReceiverPairingStatus}
            visibleReceiverPairings={orchestration.visibleReceiverPairings}
            selectReceiverPairing={orchestration.selectReceiverPairing}
            copyText={orchestration.copyText}
            receiverIntake={orchestration.receiverIntake}
            draftEditor={orchestration.draftEditor}
          />

          {/* --- Leave Coop (destructive, bottom) --- */}
          <details className="panel-card collapsible-card">
            <summary>
              <h2>Leave this coop</h2>
            </summary>
            <div className="collapsible-card__content stack">
              <p className="helper-text">
                Leaving removes your member seat from {activeCoop.profile.name}. Your local data
                stays, but you will stop receiving shared updates.
              </p>
              <button
                className="secondary-button"
                style={{ color: 'var(--coop-error, #c53030)' }}
                onClick={() => {
                  if (
                    window.confirm(`Are you sure you want to leave ${activeCoop.profile.name}?`)
                  ) {
                    void orchestration.handleLeaveCoop();
                  }
                }}
                type="button"
              >
                Leave {activeCoop.profile.name}
              </button>
            </div>
          </details>
        </>
      ) : null}

      {/* ================================================================= */}
      {/* Agent sub-tab                                                      */}
      {/* ================================================================= */}
      {nestSubTab === 'agent' && activeCoop ? (
        <NestAgentSection
          dashboard={orchestration.dashboard}
          activeCoop={orchestration.activeCoop}
          runtimeConfig={orchestration.runtimeConfig}
          agentDashboard={orchestration.agentDashboard}
          agentRunning={orchestration.agentRunning}
          actionPolicies={orchestration.actionPolicies}
          refreshableArchiveReceipts={orchestration.refreshableArchiveReceipts}
          refreshArchiveStatus={orchestration.refreshArchiveStatus}
          toggleAnchorMode={orchestration.toggleAnchorMode}
          handleRunAgentCycle={orchestration.handleRunAgentCycle}
          handleApproveAgentPlan={orchestration.handleApproveAgentPlan}
          handleRejectAgentPlan={orchestration.handleRejectAgentPlan}
          handleRetrySkillRun={orchestration.handleRetrySkillRun}
          handleToggleSkillAutoRun={orchestration.handleToggleSkillAutoRun}
          handleSetPolicy={orchestration.handleSetPolicy}
          handleProposeAction={orchestration.handleProposeAction}
          handleApproveAction={orchestration.handleApproveAction}
          handleRejectAction={orchestration.handleRejectAction}
          handleExecuteAction={orchestration.handleExecuteAction}
          handleIssuePermit={orchestration.handleIssuePermit}
          handleRevokePermit={orchestration.handleRevokePermit}
          handleExecuteWithPermit={orchestration.handleExecuteWithPermit}
          handleIssueSessionCapability={orchestration.handleIssueSessionCapability}
          handleRotateSessionCapability={orchestration.handleRotateSessionCapability}
          handleRevokeSessionCapability={orchestration.handleRevokeSessionCapability}
          handleQueueGreenGoodsWorkApproval={orchestration.handleQueueGreenGoodsWorkApproval}
          handleQueueGreenGoodsAssessment={orchestration.handleQueueGreenGoodsAssessment}
          handleQueueGreenGoodsGapAdminSync={orchestration.handleQueueGreenGoodsGapAdminSync}
          handleQueueGreenGoodsHypercertMint={orchestration.handleQueueGreenGoodsHypercertMint}
          handleQueueGreenGoodsMemberSync={orchestration.handleQueueGreenGoodsMemberSync}
        />
      ) : null}

      {/* ================================================================= */}
      {/* Settings sub-tab                                                   */}
      {/* ================================================================= */}
      {nestSubTab === 'settings' || !activeCoop ? (
        <>
          <NestSettingsSection
            dashboard={orchestration.dashboard}
            activeCoop={orchestration.activeCoop}
            runtimeConfig={orchestration.runtimeConfig}
            authSession={orchestration.authSession}
            soundPreferences={orchestration.soundPreferences}
            inferenceState={orchestration.inferenceState}
            browserUxCapabilities={orchestration.browserUxCapabilities}
            configuredReceiverAppUrl={orchestration.configuredReceiverAppUrl}
            tabCapture={orchestration.tabCapture}
            updateSound={orchestration.updateSound}
            testSound={orchestration.testSound}
            toggleLocalInferenceOptIn={orchestration.toggleLocalInferenceOptIn}
            clearSensitiveLocalData={orchestration.clearSensitiveLocalData}
            updateUiPreferences={orchestration.updateUiPreferences}
          />

          {/* --- Save & Export --- */}
          <NestArchiveSection
            archiveSnapshot={orchestration.archiveSnapshot}
            exportSnapshot={orchestration.exportSnapshot}
            exportLatestReceipt={orchestration.exportLatestReceipt}
          />

          {/* --- Archive setup wizard --- */}
          <NestArchiveWizardSection
            activeCoop={orchestration.activeCoop}
            loadDashboard={orchestration.loadDashboard}
            setMessage={orchestration.setMessage}
          />
        </>
      ) : null}

      {/* ================================================================= */}
      {/* Sources sub-tab                                                    */}
      {/* ================================================================= */}
      {nestSubTab === 'sources' && activeCoop ? (
        <NestSourcesSection
          sources={sources}
          onAddSource={handleAddSource}
          onRemoveSource={handleRemoveSource}
          onToggleSource={handleToggleSource}
        />
      ) : null}
    </section>
  );
}

// Edit sections (NestProfileSection, NestSoulSection, NestRitualSection,
// NestSetupSection) are extracted to ./NestEditSections.tsx
