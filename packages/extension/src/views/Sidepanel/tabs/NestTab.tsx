import {
  type ActionBundle,
  CAPTURE_EXCLUSION_DEFAULTS,
  type CaptureExclusionCategory,
  type CaptureMode,
  type CoopSharedState,
  type CoopSpaceType,
  type PreferredExportMethod,
  type ReceiverCapture,
  type ReceiverPairingRecord,
  formatCoopSpaceTypeLabel,
  getCoopChainLabel,
  getReceiverPairingStatus,
} from '@coop/shared';
import type { InferenceBridgeState } from '../../../runtime/inference-bridge';
import type { AgentDashboardResponse, DashboardResponse } from '../../../runtime/messages';
import { ArchiveSetupWizard } from '../ArchiveSetupWizard';
import { OperatorConsole } from '../OperatorConsole';
import { ReceiverIntakeCard } from '../cards';
import {
  describeLocalHelperState,
  formatAgentCadence,
  formatGardenPassMode,
  formatSharedWalletMode,
  getAddressExplorerUrl,
  truncateAddress,
} from '../helpers';
import type { useCoopForm } from '../hooks/useCoopForm';
import type { useDraftEditor } from '../hooks/useDraftEditor';
import type { useTabCapture } from '../hooks/useTabCapture';
import type { CreateFormState } from '../setup-insights';

// ---------------------------------------------------------------------------
// Shared hook return types
// ---------------------------------------------------------------------------

type DraftEditorReturn = ReturnType<typeof useDraftEditor>;
type TabCaptureReturn = ReturnType<typeof useTabCapture>;
type CoopFormReturn = ReturnType<typeof useCoopForm>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface NestTabProps {
  dashboard: DashboardResponse | null;
  activeCoop: CoopSharedState | undefined;
  activeMember: CoopSharedState['members'][number] | undefined;
  runtimeConfig: DashboardResponse['runtimeConfig'];
  authSession: import('@coop/shared').AuthSession | null;
  soundPreferences: import('@coop/shared').SoundPreferences;
  inferenceState: InferenceBridgeState | null;
  browserUxCapabilities: ReturnType<typeof import('@coop/shared').detectBrowserUxCapabilities>;
  configuredReceiverAppUrl: string;
  stealthMetaAddress: string | null;
  coopForm: CoopFormReturn;
  inviteResult: import('@coop/shared').InviteCode | null;
  createInvite: (inviteType: 'trusted' | 'member') => void;
  createReceiverPairing: () => void;
  activeReceiverPairing: ReceiverPairingRecord | null;
  activeReceiverPairingStatus: ReturnType<typeof getReceiverPairingStatus> | null;
  activeReceiverProtocolLink: string;
  visibleReceiverPairings: ReceiverPairingRecord[];
  selectReceiverPairing: (pairingId: string) => void;
  copyText: (label: string, value: string) => void;
  receiverIntake: ReceiverCapture[];
  draftEditor: DraftEditorReturn;
  tabCapture: TabCaptureReturn;
  greenGoodsActionQueue: ActionBundle[];
  // Operator console props
  agentDashboard: AgentDashboardResponse | null;
  actionPolicies: import('@coop/shared').ActionPolicy[];
  archiveStory: ReturnType<typeof import('@coop/shared').buildCoopArchiveStory> | null;
  archiveReceipts: ReturnType<typeof import('@coop/shared').describeArchiveReceipt>[];
  refreshableArchiveReceipts: CoopSharedState['archiveReceipts'];
  boardUrl: string | undefined;
  archiveSnapshot: () => Promise<void>;
  archiveArtifact: (artifactId: string) => Promise<void>;
  toggleArtifactArchiveWorthiness: (artifactId: string, flagged: boolean) => Promise<void>;
  toggleAnchorMode: (enabled: boolean) => Promise<void>;
  refreshArchiveStatus: (receiptId?: string) => Promise<void>;
  exportSnapshot: (format: 'json' | 'text') => Promise<void>;
  exportLatestArtifact: (format: 'json' | 'text') => Promise<void>;
  exportLatestReceipt: (format: 'json' | 'text') => Promise<void>;
  archiveLatestArtifact: () => Promise<void>;
  handleRunAgentCycle: () => Promise<void>;
  handleApproveAgentPlan: (planId: string) => Promise<void>;
  handleRejectAgentPlan: (planId: string) => Promise<void>;
  handleRetrySkillRun: (skillRunId: string) => Promise<void>;
  handleToggleSkillAutoRun: (skillId: string, enabled: boolean) => Promise<void>;
  handleSetPolicy: (
    actionClass: import('@coop/shared').PolicyActionClass,
    approvalRequired: boolean,
  ) => Promise<void>;
  handleProposeAction: (
    actionClass: import('@coop/shared').PolicyActionClass,
    payload: Record<string, unknown>,
  ) => Promise<void>;
  handleApproveAction: (bundleId: string) => Promise<void>;
  handleRejectAction: (bundleId: string) => Promise<void>;
  handleExecuteAction: (bundleId: string) => Promise<void>;
  handleIssuePermit: (input: {
    coopId: string;
    expiresAt: string;
    maxUses: number;
    allowedActions: import('@coop/shared').DelegatedActionClass[];
  }) => Promise<void>;
  handleRevokePermit: (permitId: string) => Promise<void>;
  handleExecuteWithPermit: (
    permitId: string,
    actionClass: import('@coop/shared').DelegatedActionClass,
    actionPayload: Record<string, unknown>,
  ) => Promise<void>;
  handleIssueSessionCapability: (input: {
    coopId: string;
    expiresAt: string;
    maxUses: number;
    allowedActions: import('@coop/shared').SessionCapableActionClass[];
  }) => Promise<void>;
  handleRotateSessionCapability: (capabilityId: string) => Promise<void>;
  handleRevokeSessionCapability: (capabilityId: string) => Promise<void>;
  handleQueueGreenGoodsWorkApproval: (
    coopId: string,
    request: import('@coop/shared').GreenGoodsWorkApprovalRequest,
  ) => Promise<void>;
  handleQueueGreenGoodsAssessment: (
    coopId: string,
    request: import('@coop/shared').GreenGoodsAssessmentRequest,
  ) => Promise<void>;
  handleQueueGreenGoodsGapAdminSync: (coopId: string) => Promise<void>;
  handleQueueGreenGoodsMemberSync: (coopId: string) => Promise<void>;
  onAnchorOnChain: (receiptId: string) => void;
  onFvmRegister?: (receiptId: string) => void;
  updateSound: (next: import('@coop/shared').SoundPreferences) => Promise<void>;
  testSound: () => Promise<void>;
  toggleLocalInferenceOptIn: () => Promise<void>;
  clearSensitiveLocalData: () => Promise<void>;
  updateUiPreferences: (
    patch: Partial<import('@coop/shared').UiPreferences>,
  ) => Promise<import('@coop/shared').UiPreferences | null>;
  loadDashboard: () => Promise<void>;
  setMessage: (msg: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NestTab({
  dashboard,
  activeCoop,
  activeMember,
  runtimeConfig,
  authSession,
  soundPreferences,
  inferenceState,
  browserUxCapabilities,
  configuredReceiverAppUrl,
  stealthMetaAddress,
  coopForm,
  inviteResult,
  createInvite,
  createReceiverPairing,
  activeReceiverPairing,
  activeReceiverPairingStatus,
  activeReceiverProtocolLink,
  visibleReceiverPairings,
  selectReceiverPairing,
  copyText,
  receiverIntake,
  draftEditor,
  tabCapture,
  greenGoodsActionQueue,
  agentDashboard,
  actionPolicies,
  archiveStory,
  archiveReceipts,
  refreshableArchiveReceipts,
  boardUrl,
  archiveSnapshot,
  archiveArtifact,
  toggleArtifactArchiveWorthiness,
  toggleAnchorMode,
  refreshArchiveStatus,
  exportSnapshot,
  exportLatestArtifact,
  exportLatestReceipt,
  archiveLatestArtifact,
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
  onAnchorOnChain,
  onFvmRegister,
  updateSound,
  testSound,
  toggleLocalInferenceOptIn,
  clearSensitiveLocalData,
  updateUiPreferences,
  loadDashboard,
  setMessage,
}: NestTabProps) {
  return (
    <section className="stack">
      {/* --- Coop Creation / Join --- */}
      {!activeCoop ? (
        <article className="panel-card">
          <h2>Start a Coop</h2>
          <p className="helper-text">
            This sets up the coop, your first member seat, and the starter rhythm for catching
            useful knowledge together.
          </p>
          <form className="form-grid" onSubmit={coopForm.createCoopAction}>
            <div className="detail-grid">
              <div className="field-grid">
                <label htmlFor="coop-space-type">Coop style</label>
                <select
                  id="coop-space-type"
                  onChange={(event) =>
                    coopForm.setCreateForm((current) => ({
                      ...current,
                      spaceType: event.target.value as CoopSpaceType,
                    }))
                  }
                  value={coopForm.createForm.spaceType}
                >
                  {coopForm.coopSpacePresets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </select>
                <span className="helper-text">{coopForm.selectedSpacePreset.description}</span>
              </div>
              <div className="field-grid">
                <label htmlFor="coop-name">Coop name</label>
                <input
                  id="coop-name"
                  onChange={(event) =>
                    coopForm.setCreateForm((current) => ({
                      ...current,
                      coopName: event.target.value,
                    }))
                  }
                  placeholder={`${coopForm.selectedSpacePreset.label} name`}
                  required
                  value={coopForm.createForm.coopName}
                />
              </div>
              <div className="field-grid">
                <label htmlFor="coop-purpose">What is this coop for?</label>
                <input
                  id="coop-purpose"
                  onChange={(event) =>
                    coopForm.setCreateForm((current) => ({
                      ...current,
                      purpose: event.target.value,
                    }))
                  }
                  placeholder={coopForm.selectedSpacePreset.purposePlaceholder}
                  required
                  value={coopForm.createForm.purpose}
                />
              </div>
              <div className="field-grid">
                <label htmlFor="creator-name">Your display name</label>
                <input
                  id="creator-name"
                  onChange={(event) =>
                    coopForm.setCreateForm((current) => ({
                      ...current,
                      creatorDisplayName: event.target.value,
                    }))
                  }
                  required
                  value={coopForm.createForm.creatorDisplayName}
                />
              </div>
              <div className="field-grid">
                <label htmlFor="capture-mode">Round-up timing</label>
                <select
                  id="capture-mode"
                  onChange={(event) =>
                    coopForm.setCreateForm((current) => ({
                      ...current,
                      captureMode: event.target.value as CaptureMode,
                    }))
                  }
                  value={coopForm.createForm.captureMode}
                >
                  <option value="manual">Only when I choose</option>
                  <option value="5-min">Every 5 min</option>
                  <option value="10-min">Every 10 min</option>
                  <option value="15-min">Every 15 min</option>
                  <option value="30-min">Every 30 min</option>
                  <option value="60-min">Every 60 min</option>
                </select>
              </div>
            </div>

            <div className="field-grid">
              <label htmlFor="summary">Big picture</label>
              <textarea
                id="summary"
                onChange={(event) =>
                  coopForm.setCreateForm((current) => ({
                    ...current,
                    summary: event.target.value,
                  }))
                }
                placeholder={coopForm.selectedSpacePreset.summaryPlaceholder}
                required
                value={coopForm.createForm.summary}
              />
              <span className="helper-text">
                One or two sentences is enough. Coop can learn the rest as you go.
              </span>
            </div>

            <div className="field-grid">
              <label htmlFor="seed-contribution">Your starter note</label>
              <textarea
                id="seed-contribution"
                onChange={(event) =>
                  coopForm.setCreateForm((current) => ({
                    ...current,
                    seedContribution: event.target.value,
                  }))
                }
                placeholder={coopForm.selectedSpacePreset.seedContributionPlaceholder}
                required
                value={coopForm.createForm.seedContribution}
              />
              <span className="helper-text">
                Drop in the first thread, clue, or question you want this coop to remember.
              </span>
            </div>

            <details className="panel-card collapsible-card">
              <summary>Optional: teach Coop a little more</summary>
              <div className="collapsible-card__content stack">
                <p className="helper-text">
                  Skip this if you want a quick hatch. Coop will fill these from your big picture
                  and starter note, and you can refine them later.
                </p>
                <div className="field-grid">
                  <label htmlFor="green-goods-garden">Add a Green Goods garden</label>
                  <label className="helper-text" htmlFor="green-goods-garden">
                    <input
                      id="green-goods-garden"
                      type="checkbox"
                      checked={coopForm.createForm.createGreenGoodsGarden}
                      onChange={(event) =>
                        coopForm.setCreateForm((current) => ({
                          ...current,
                          createGreenGoodsGarden: event.target.checked,
                        }))
                      }
                    />{' '}
                    Request a Green Goods garden owned by the coop safe
                  </label>
                  <span className="helper-text">
                    {coopForm.selectedSpacePreset.greenGoodsRecommended
                      ? 'Useful when this coop may route shared work into Green Goods later.'
                      : 'Usually leave this off unless you know this coop needs a Green Goods path.'}
                  </span>
                </div>

                <div className="lens-grid">
                  {(
                    [
                      [
                        'capitalCurrent',
                        'capitalPain',
                        'capitalImprove',
                        'Money & resources',
                        coopForm.selectedSpacePreset.lensHints.capital,
                      ],
                      [
                        'impactCurrent',
                        'impactPain',
                        'impactImprove',
                        'Impact & outcomes',
                        coopForm.selectedSpacePreset.lensHints.impact,
                      ],
                      [
                        'governanceCurrent',
                        'governancePain',
                        'governanceImprove',
                        'Decisions & teamwork',
                        coopForm.selectedSpacePreset.lensHints.governance,
                      ],
                      [
                        'knowledgeCurrent',
                        'knowledgePain',
                        'knowledgeImprove',
                        'Knowledge & tools',
                        coopForm.selectedSpacePreset.lensHints.knowledge,
                      ],
                    ] as const
                  ).map(([currentKey, painKey, improveKey, title, hint]) => (
                    <div className="panel-card" key={title}>
                      <h3>{title}</h3>
                      <p className="helper-text">{hint}</p>
                      <div className="field-grid">
                        <label htmlFor={`${currentKey}`}>How do you handle this today?</label>
                        <textarea
                          id={`${currentKey}`}
                          onChange={(event) =>
                            coopForm.setCreateForm((current) => ({
                              ...current,
                              [currentKey]: event.target.value,
                            }))
                          }
                          value={coopForm.createForm[currentKey as keyof CreateFormState] as string}
                        />
                      </div>
                      <div className="field-grid">
                        <label htmlFor={`${painKey}`}>What feels messy or hard?</label>
                        <textarea
                          id={`${painKey}`}
                          onChange={(event) =>
                            coopForm.setCreateForm((current) => ({
                              ...current,
                              [painKey]: event.target.value,
                            }))
                          }
                          value={coopForm.createForm[painKey as keyof CreateFormState] as string}
                        />
                      </div>
                      <div className="field-grid">
                        <label htmlFor={`${improveKey}`}>What should get easier?</label>
                        <textarea
                          id={`${improveKey}`}
                          onChange={(event) =>
                            coopForm.setCreateForm((current) => ({
                              ...current,
                              [improveKey]: event.target.value,
                            }))
                          }
                          value={coopForm.createForm[improveKey as keyof CreateFormState] as string}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </details>

            <details className="panel-card collapsible-card archive-setup-section">
              <summary>
                <h3>Connect Storacha space (optional)</h3>
              </summary>
              <div className="collapsible-card__content stack">
                <p className="helper-text">
                  Each coop can archive to its own Storacha space. Skip to use practice mode.
                </p>
                <div className="field-grid">
                  <label htmlFor="archive-space-did">Space DID</label>
                  <input
                    id="archive-space-did"
                    type="text"
                    placeholder="did:key:..."
                    value={coopForm.createForm.archiveSpaceDid}
                    onChange={(event) =>
                      coopForm.setCreateForm((current) => ({
                        ...current,
                        archiveSpaceDid: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="field-grid">
                  <label htmlFor="archive-agent-key">Agent Private Key</label>
                  <input
                    id="archive-agent-key"
                    type="password"
                    placeholder="Base64 or hex encoded"
                    value={coopForm.createForm.archiveAgentPrivateKey}
                    onChange={(event) =>
                      coopForm.setCreateForm((current) => ({
                        ...current,
                        archiveAgentPrivateKey: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="field-grid">
                  <label htmlFor="archive-space-delegation">Space Delegation</label>
                  <input
                    id="archive-space-delegation"
                    type="text"
                    placeholder="Base64 encoded delegation"
                    value={coopForm.createForm.archiveSpaceDelegation}
                    onChange={(event) =>
                      coopForm.setCreateForm((current) => ({
                        ...current,
                        archiveSpaceDelegation: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="field-grid">
                  <label htmlFor="archive-gateway-url">Gateway URL</label>
                  <input
                    id="archive-gateway-url"
                    type="text"
                    placeholder="https://storacha.link"
                    value={coopForm.createForm.archiveGatewayUrl}
                    onChange={(event) =>
                      coopForm.setCreateForm((current) => ({
                        ...current,
                        archiveGatewayUrl: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </details>

            <p className="helper-text">
              Start now. You can teach Coop more after the first round-up.
            </p>

            <button className="primary-button" type="submit">
              Start This Coop
            </button>
          </form>
        </article>
      ) : null}

      {/* --- Invite --- */}
      <details className="panel-card collapsible-card">
        <summary>
          <h2>Invite the Flock</h2>
        </summary>
        <div className="collapsible-card__content stack">
          <p className="helper-text">
            Bring in trusted helpers or regular members with a simple invite.
          </p>
          <div className="action-row">
            <button
              className="secondary-button"
              onClick={() => createInvite('trusted')}
              type="button"
            >
              Trusted Member Invite
            </button>
            <button
              className="secondary-button"
              onClick={() => createInvite('member')}
              type="button"
            >
              Member Invite
            </button>
          </div>
          {inviteResult ? (
            <div className="field-grid">
              <label htmlFor="invite-code">Fresh invite code</label>
              <textarea id="invite-code" readOnly value={inviteResult.code} />
            </div>
          ) : null}
          <form className="form-grid" onSubmit={coopForm.joinCoopAction}>
            <div className="field-grid">
              <label htmlFor="join-code">Invite code</label>
              <textarea
                id="join-code"
                onChange={(event) => coopForm.setJoinInvite(event.target.value)}
                required
                value={coopForm.joinInvite}
              />
            </div>
            <div className="detail-grid">
              <div className="field-grid">
                <label htmlFor="join-name">Display name</label>
                <input
                  id="join-name"
                  onChange={(event) => coopForm.setJoinName(event.target.value)}
                  required
                  value={coopForm.joinName}
                />
              </div>
              <div className="field-grid">
                <label htmlFor="join-seed">Starter note</label>
                <input
                  id="join-seed"
                  onChange={(event) => coopForm.setJoinSeed(event.target.value)}
                  required
                  value={coopForm.joinSeed}
                />
              </div>
            </div>
            <button className="primary-button" type="submit">
              Join This Coop
            </button>
          </form>
        </div>
      </details>

      {/* --- Member list --- */}
      {activeCoop ? (
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
                    Share this address to receive payments privately. Each payment goes to a unique,
                    unlinkable stealth address.
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
                    <button
                      className="btn-sm"
                      onClick={() => navigator.clipboard.writeText(stealthMetaAddress)}
                      title="Copy stealth address"
                      type="button"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </details>
            )}
          </div>
        </details>
      ) : null}

      {/* --- Operator Console --- */}
      <OperatorConsole
        actionLog={dashboard?.operator.actionLog ?? []}
        agentObservations={agentDashboard?.observations ?? []}
        agentPlans={agentDashboard?.plans ?? []}
        anchorActive={dashboard?.operator.anchorActive ?? false}
        anchorCapability={dashboard?.operator.anchorCapability ?? null}
        anchorDetail={
          dashboard?.operator.anchorDetail ??
          'Trusted mode is off. Live saves and shared-wallet steps stay in practice mode.'
        }
        archiveMode={dashboard?.operator.archiveMode ?? 'mock'}
        autoRunSkillIds={agentDashboard?.autoRunSkillIds ?? []}
        liveArchiveAvailable={dashboard?.operator.liveArchiveAvailable ?? true}
        liveArchiveDetail={
          dashboard?.operator.liveArchiveDetail ??
          'Practice saves still work here even when trusted mode is off.'
        }
        liveOnchainAvailable={dashboard?.operator.liveOnchainAvailable ?? true}
        liveOnchainDetail={
          dashboard?.operator.liveOnchainDetail ??
          'Practice shared-wallet steps still work here even when trusted mode is off.'
        }
        onApprovePlan={handleApproveAgentPlan}
        onRefreshArchiveStatus={() => refreshArchiveStatus()}
        onRejectPlan={handleRejectAgentPlan}
        onRetrySkillRun={handleRetrySkillRun}
        onRunAgentCycle={handleRunAgentCycle}
        onToggleAnchor={toggleAnchorMode}
        onToggleSkillAutoRun={handleToggleSkillAutoRun}
        onchainMode={dashboard?.operator.onchainMode ?? runtimeConfig.onchainMode}
        refreshableReceiptCount={refreshableArchiveReceipts.length}
        policies={actionPolicies}
        actionQueue={dashboard?.operator.policyActionQueue ?? []}
        actionHistory={dashboard?.operator.policyActionLogEntries ?? []}
        onSetPolicy={handleSetPolicy}
        onProposeAction={handleProposeAction}
        onApproveAction={handleApproveAction}
        onRejectAction={handleRejectAction}
        onExecuteAction={handleExecuteAction}
        permits={dashboard?.operator.permits ?? []}
        permitLog={dashboard?.operator.permitLog ?? []}
        onIssuePermit={handleIssuePermit}
        onRevokePermit={handleRevokePermit}
        onExecuteWithPermit={handleExecuteWithPermit}
        sessionMode={runtimeConfig.sessionMode}
        sessionCapabilities={dashboard?.operator.sessionCapabilities ?? []}
        sessionCapabilityLog={dashboard?.operator.sessionCapabilityLog ?? []}
        onIssueSessionCapability={handleIssueSessionCapability}
        onRotateSessionCapability={handleRotateSessionCapability}
        onRevokeSessionCapability={handleRevokeSessionCapability}
        greenGoodsContext={
          activeCoop
            ? {
                coopId: activeCoop.profile.id,
                coopName: activeCoop.profile.name,
                enabled: activeCoop.greenGoods?.enabled ?? false,
                gardenAddress: activeCoop.greenGoods?.gardenAddress,
                memberBindings: (activeCoop.greenGoods?.memberBindings ?? []).map((binding) => ({
                  ...binding,
                  memberDisplayName:
                    activeCoop.members.find((member) => member.id === binding.memberId)
                      ?.displayName ?? binding.memberId,
                })),
              }
            : undefined
        }
        onQueueGreenGoodsWorkApproval={handleQueueGreenGoodsWorkApproval}
        onQueueGreenGoodsAssessment={handleQueueGreenGoodsAssessment}
        onQueueGreenGoodsGapAdminSync={handleQueueGreenGoodsGapAdminSync}
        onQueueGreenGoodsMemberSync={handleQueueGreenGoodsMemberSync}
        activeCoopId={activeCoop?.profile.id}
        activeCoopName={activeCoop?.profile.name}
        skillManifests={agentDashboard?.manifests ?? []}
        skillRuns={agentDashboard?.skillRuns ?? []}
        memories={agentDashboard?.memories ?? []}
      />

      {/* --- Receiver management --- */}
      <article className="panel-card">
        <h2>Receiver Pairings</h2>
        <p className="helper-text">
          Manage paired devices. Anything hatched on a phone lands here first.
        </p>
        <div className="action-row">
          <button className="primary-button" onClick={createReceiverPairing} type="button">
            Generate nest code
          </button>
        </div>
        {activeReceiverPairing ? (
          <div className="stack">
            {activeReceiverPairingStatus ? (
              <p className="helper-text">
                Status: {activeReceiverPairingStatus.status} · {activeReceiverPairingStatus.message}
              </p>
            ) : null}
            <div className="field-grid">
              <label htmlFor="receiver-pairing-payload">Nest code</label>
              <textarea
                id="receiver-pairing-payload"
                readOnly
                value={activeReceiverPairing.pairingCode ?? ''}
              />
            </div>
            <div className="action-row">
              <button
                className="secondary-button"
                onClick={() => void copyText('Nest code', activeReceiverPairing.pairingCode ?? '')}
                type="button"
              >
                Copy nest code
              </button>
              <button
                className="secondary-button"
                onClick={() =>
                  void copyText('Pocket Coop link', activeReceiverPairing.deepLink ?? '')
                }
                type="button"
              >
                Copy app link
              </button>
            </div>
            <div className="receiver-pairing-list">
              {visibleReceiverPairings.map((pairing) => (
                <button
                  className={pairing.active ? 'inline-button' : 'secondary-button'}
                  key={pairing.pairingId}
                  onClick={() => void selectReceiverPairing(pairing.pairingId)}
                  type="button"
                >
                  {pairing.memberDisplayName} · {getReceiverPairingStatus(pairing).status} ·{' '}
                  {pairing.lastSyncedAt
                    ? `Last sync ${new Date(pairing.lastSyncedAt).toLocaleString()}`
                    : 'Waiting for first sync'}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            No nest code yet. Generate one, then open it in the companion app.
          </div>
        )}
      </article>

      {/* --- Receiver intake --- */}
      <article className="panel-card">
        <h2>Pocket Coop Finds</h2>
        <p className="helper-text">Things hatched on the phone land here first.</p>
        <div className="receiver-intake-list">
          {receiverIntake.map((capture) => (
            <ReceiverIntakeCard key={capture.id} capture={capture} draftEditor={draftEditor} />
          ))}
        </div>
        {receiverIntake.length === 0 ? (
          <div className="empty-state">
            No Pocket Coop finds yet. Once the companion app hatches a note, photo, or link and
            syncs, it lands here first.
          </div>
        ) : null}
      </article>

      {/* --- Save and Export --- */}
      <article className="panel-card">
        <h2>Save and Export</h2>
        <div className="action-row">
          <button className="primary-button" onClick={archiveLatestArtifact} type="button">
            Save latest find
          </button>
          <button className="secondary-button" onClick={archiveSnapshot} type="button">
            Save Coop Snapshot
          </button>
          <button className="secondary-button" onClick={() => exportSnapshot('json')} type="button">
            Export JSON snapshot
          </button>
          <button
            className="secondary-button"
            onClick={() => exportLatestReceipt('json')}
            type="button"
          >
            Export saved proof JSON
          </button>
        </div>
      </article>

      {/* --- Data operations --- */}
      <article className="panel-card">
        <h2>Data</h2>
        <div className="action-row">
          <button className="secondary-button" onClick={clearSensitiveLocalData} type="button">
            Clear encrypted capture history
          </button>
        </div>
        <p className="helper-text">
          This clears local tab captures, page extracts, drafts, receiver intake, and agent memories
          from this browser without touching shared coop memory.
        </p>
      </article>

      {/* --- Recent Roundups --- */}
      {(dashboard?.recentCaptureRuns?.length ?? 0) > 0 && (
        <details className="panel-card collapsible-card">
          <summary>
            <h2>Recent roundups</h2>
          </summary>
          <div className="collapsible-card__content">
            <ul className="list-reset stack" style={{ fontSize: '0.85rem' }}>
              {dashboard?.recentCaptureRuns?.map((run) => (
                <li
                  key={run.id}
                  style={{ borderBottom: '1px solid var(--border, #333)', paddingBottom: '0.5rem' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>
                      {run.candidateCount} tab{run.candidateCount !== 1 ? 's' : ''} captured
                    </strong>
                    <span className="helper-text">
                      {new Date(run.capturedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {run.capturedDomains && run.capturedDomains.length > 0 && (
                    <div className="helper-text">{run.capturedDomains.join(', ')}</div>
                  )}
                  {(run.skippedCount ?? 0) > 0 && (
                    <div className="helper-text">{run.skippedCount} excluded</div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}

      {/* --- Settings --- */}
      <article className="panel-card">
        <h2>Settings</h2>
        <div className="field-grid">
          <strong>Your passkey</strong>
          <div className="helper-text">
            {authSession ? (
              <>
                {authSession.displayName} · {authSession.primaryAddress}
                <br />
                {authSession.identityWarning}
              </>
            ) : (
              'No passkey stored yet. Coop will ask for one when you start or join a coop.'
            )}
          </div>
        </div>
        <div className="field-grid">
          <label htmlFor="settings-agent-cadence">Agent cadence</label>
          <select
            id="settings-agent-cadence"
            onChange={(event) =>
              void tabCapture.updateAgentCadence(Number(event.target.value) as 4 | 8 | 16 | 32 | 64)
            }
            value={dashboard?.uiPreferences.agentCadenceMinutes ?? 64}
          >
            <option value="4">{formatAgentCadence(4)}</option>
            <option value="8">{formatAgentCadence(8)}</option>
            <option value="16">{formatAgentCadence(16)}</option>
            <option value="32">{formatAgentCadence(32)}</option>
            <option value="64">{formatAgentCadence(64)}</option>
          </select>
        </div>
        <div className="field-grid">
          <label htmlFor="sound-enabled">Coop sounds</label>
          <select
            id="sound-enabled"
            onChange={(event) =>
              void updateSound({
                ...soundPreferences,
                enabled: event.target.value === 'on',
              })
            }
            value={soundPreferences.enabled ? 'on' : 'off'}
          >
            <option value="off">Muted</option>
            <option value="on">Play when something important happens</option>
          </select>
        </div>
        <div className="action-row">
          <button className="secondary-button" onClick={testSound} type="button">
            Test coop sound
          </button>
          <button className="secondary-button" onClick={tabCapture.runManualCapture} type="button">
            Round up now
          </button>
        </div>
        <p className="helper-text">
          Quiet by default. Passive scans stay silent, and reduced-sound preferences still win.
        </p>
        <div className="field-grid">
          <label htmlFor="settings-notifications">Notifications</label>
          <select
            id="settings-notifications"
            onChange={(event) =>
              void updateUiPreferences({
                notificationsEnabled: event.target.value === 'on',
              })
            }
            value={dashboard?.uiPreferences.notificationsEnabled ? 'on' : 'off'}
          >
            <option value="on">On</option>
            <option value="off">Off</option>
          </select>
        </div>
        <div className="field-grid">
          <label htmlFor="settings-export-method">Export method</label>
          <select
            id="settings-export-method"
            onChange={(event) =>
              void updateUiPreferences({
                preferredExportMethod: event.target.value as PreferredExportMethod,
              })
            }
            value={dashboard?.uiPreferences.preferredExportMethod ?? 'download'}
          >
            <option value="download">Browser download</option>
            <option disabled={!browserUxCapabilities.canSaveFile} value="file-picker">
              File picker
            </option>
          </select>
        </div>
        <p className="helper-text">
          Notifications cover extension moments only. File picker export falls back to a normal
          download whenever the browser does not support it.
        </p>

        <h3>Privacy exclusions</h3>
        <p className="helper-text">
          Sites in these categories are never captured during round-ups. Your data stays local —
          this simply prevents sensitive pages from entering the capture pipeline at all.
        </p>
        {(
          [
            ['email', 'Email'],
            ['banking', 'Banking & Finance'],
            ['health', 'Health'],
            ['social-dm', 'Social Media DMs'],
          ] as const
        ).map(([category, label]) => (
          <label className="field-grid checkbox-row" key={category}>
            <input
              checked={dashboard?.uiPreferences.excludedCategories?.includes(category) ?? false}
              onChange={(event) => {
                const current = dashboard?.uiPreferences.excludedCategories ?? [];
                const next = event.target.checked
                  ? [...current, category]
                  : current.filter((c: CaptureExclusionCategory) => c !== category);
                void tabCapture.updateExcludedCategories(next);
              }}
              type="checkbox"
            />
            <span>
              {label}{' '}
              <span className="helper-text">
                ({CAPTURE_EXCLUSION_DEFAULTS[category].length} sites)
              </span>
            </span>
          </label>
        ))}
        <div className="field-grid">
          <label htmlFor="settings-custom-excluded-domain">Custom excluded domains</label>
          <div className="action-row">
            <input
              id="settings-custom-excluded-domain"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  const input = event.currentTarget;
                  const raw = input.value
                    .trim()
                    .toLowerCase()
                    .replace(/^https?:\/\//, '')
                    .replace(/\/.*$/, '');
                  const domain = raw;
                  if (!domain) return;
                  const current = dashboard?.uiPreferences.customExcludedDomains ?? [];
                  if (!current.includes(domain)) {
                    void tabCapture.updateCustomExcludedDomains([...current, domain]);
                  }
                  input.value = '';
                }
              }}
              placeholder="e.g. my-private-site.com"
              type="text"
            />
          </div>
          {(dashboard?.uiPreferences.customExcludedDomains ?? []).length > 0 && (
            <ul className="list-reset" style={{ fontSize: '0.85rem' }}>
              {dashboard?.uiPreferences.customExcludedDomains.map((domain: string) => (
                <li
                  key={domain}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <code>{domain}</code>
                  <button
                    className="btn-sm"
                    onClick={() => {
                      const current = dashboard?.uiPreferences.customExcludedDomains ?? [];
                      void tabCapture.updateCustomExcludedDomains(
                        current.filter((d: string) => d !== domain),
                      );
                    }}
                    type="button"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="field-grid">
          <label htmlFor="settings-capture-on-close">Capture closing tabs</label>
          <select
            id="settings-capture-on-close"
            onChange={(event) => void tabCapture.toggleCaptureOnClose(event.target.value === 'on')}
            value={dashboard?.uiPreferences.captureOnClose ? 'on' : 'off'}
          >
            <option value="off">Off</option>
            <option value="on">Capture tabs when they close</option>
          </select>
        </div>
        <p className="helper-text">
          When enabled, tabs are captured as they close so short-lived pages are not missed between
          round-ups. Only metadata (URL, title) is saved — no page content is extracted from closed
          tabs.
        </p>
      </article>

      {/* --- Nest Setup --- */}
      <article className="panel-card">
        <h2>Nest Setup</h2>
        <p className="helper-text">
          Check this before a demo so both browsers point at the same setup.
        </p>
        <div className="detail-grid archive-detail-grid">
          <div>
            <strong>Chain</strong>
            <p className="helper-text">{getCoopChainLabel(runtimeConfig.chainKey)}</p>
          </div>
          <div>
            <strong>Shared wallet mode</strong>
            <p className="helper-text">{formatSharedWalletMode(runtimeConfig.onchainMode)}</p>
          </div>
          <div>
            <strong>Save mode</strong>
            <p className="helper-text">
              {activeCoop?.archiveConfig
                ? 'Live (own space)'
                : dashboard?.operator?.liveArchiveAvailable
                  ? 'Live (shared)'
                  : 'Practice'}
            </p>
          </div>
          <div>
            <strong>Garden pass mode</strong>
            <p className="helper-text">{formatGardenPassMode(runtimeConfig.sessionMode)}</p>
          </div>
          <div>
            <strong>Pocket Coop home</strong>
            <p className="helper-text">{runtimeConfig.receiverAppUrl}</p>
          </div>
          <div>
            <strong>Sync bridge</strong>
            <p className="helper-text">
              {runtimeConfig.signalingUrls.length > 0
                ? runtimeConfig.signalingUrls.join(', ')
                : 'No sync bridge is configured. Nest codes still work locally, but live sync waits for a bridge.'}
            </p>
          </div>
        </div>
        <div className="detail-grid archive-detail-grid">
          <div>
            <strong>What this browser can do</strong>
            <p className="helper-text">
              Notifications {browserUxCapabilities.canNotify ? 'ready' : 'unavailable'} · QR{' '}
              {browserUxCapabilities.canScanQr ? 'ready' : 'unavailable'} · Share{' '}
              {browserUxCapabilities.canShare ? 'ready' : 'unavailable'} · Badge{' '}
              {browserUxCapabilities.canSetBadge ? 'ready' : 'unavailable'} · File picker{' '}
              {browserUxCapabilities.canSaveFile ? 'ready' : 'unavailable'}
            </p>
          </div>
        </div>
        <div className="action-row">
          <a
            className="secondary-button"
            href={configuredReceiverAppUrl}
            rel="noreferrer"
            target="_blank"
          >
            Open Pocket Coop
          </a>
        </div>
      </article>

      {/* --- Local Helper --- */}
      <article className="panel-card">
        <h2>Local Helper</h2>
        <div className="field-grid">
          <label htmlFor="local-inference-opt-in">Local helper</label>
          <select
            id="local-inference-opt-in"
            onChange={() => void toggleLocalInferenceOptIn()}
            value={dashboard?.summary.localInferenceOptIn ? 'on' : 'off'}
          >
            <option value="off">Off (quick rules only)</option>
            <option value="on">On (private helper)</option>
          </select>
        </div>
        <div className="helper-text">
          {inferenceState
            ? describeLocalHelperState(inferenceState.capability)
            : 'Quick rules first'}
        </div>
      </article>

      {/* --- Archive setup wizard --- */}
      {activeCoop ? (
        <ArchiveSetupWizard
          coopId={activeCoop.profile.id}
          coopName={activeCoop.profile.name}
          archiveConfig={activeCoop.archiveConfig}
          onComplete={loadDashboard}
          setMessage={setMessage}
        />
      ) : null}
    </section>
  );
}
