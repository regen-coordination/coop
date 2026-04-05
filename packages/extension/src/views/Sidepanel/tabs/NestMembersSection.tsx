import type { CaptureMode, CoopSharedState, CoopSoul, SetupInsights } from '@coop/shared';
import { formatCoopSpaceTypeLabel, getCoopChainLabel } from '@coop/shared';
import { useEffect, useState } from 'react';
import type { DashboardResponse } from '../../../runtime/messages';
import { Tooltip } from '../../shared/Tooltip';
import { getAddressExplorerUrl, truncateAddress } from '../helpers';
import type { SidepanelOrchestration } from '../hooks/useSidepanelOrchestration';
import { NestInviteSection } from './NestInviteSection';
import { NestReceiverSection } from './NestReceiverSection';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface NestMembersSectionProps {
  activeCoop: CoopSharedState;
  orchestration: SidepanelOrchestration;
  runtimeConfig: DashboardResponse['runtimeConfig'];
  stealthMetaAddress: string | null;
  inviteControlsOpen: boolean;
  setInviteControlsOpen: (open: boolean) => void;
  inviteFocusRequest: number;
  updateCoopDetails: SidepanelOrchestration['updateCoopDetails'];
  updateMeetingSettings: SidepanelOrchestration['updateMeetingSettings'];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NestMembersSection({
  activeCoop,
  orchestration,
  runtimeConfig,
  stealthMetaAddress,
  inviteControlsOpen,
  inviteFocusRequest,
  setInviteControlsOpen,
  updateCoopDetails,
  updateMeetingSettings,
}: NestMembersSectionProps) {
  return (
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
      <NestRitualSection activeCoop={activeCoop} updateMeetingSettings={updateMeetingSettings} />
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
            Leaving removes your member seat from {activeCoop.profile.name}. Your local data stays,
            but you will stop receiving shared updates.
          </p>
          <button
            className="secondary-button"
            style={{ color: 'var(--coop-error, #c53030)' }}
            onClick={() => {
              if (window.confirm(`Are you sure you want to leave ${activeCoop.profile.name}?`)) {
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
  );
}

// ---------------------------------------------------------------------------
// Edit Coop Sections
// ---------------------------------------------------------------------------

type CoreSoulPatch = Partial<
  Pick<
    CoopSoul,
    | 'purposeStatement'
    | 'whyThisCoopExists'
    | 'usefulSignalDefinition'
    | 'toneAndWorkingStyle'
    | 'artifactFocus'
  >
>;

type SetupEditFormState = {
  summary: string;
  capitalCurrent: string;
  capitalPain: string;
  capitalImprove: string;
  impactCurrent: string;
  impactPain: string;
  impactImprove: string;
  governanceCurrent: string;
  governancePain: string;
  governanceImprove: string;
  knowledgeCurrent: string;
  knowledgePain: string;
  knowledgeImprove: string;
};

type RitualEditFormState = {
  weeklyReviewCadence: string;
  namedMoments: string;
  facilitatorExpectation: string;
  defaultCapturePosture: string;
};

const setupLensFieldMap = [
  {
    lens: 'capital-formation',
    currentKey: 'capitalCurrent',
    painKey: 'capitalPain',
    improveKey: 'capitalImprove',
    title: 'Money & resources',
  },
  {
    lens: 'impact-reporting',
    currentKey: 'impactCurrent',
    painKey: 'impactPain',
    improveKey: 'impactImprove',
    title: 'Impact & outcomes',
  },
  {
    lens: 'governance-coordination',
    currentKey: 'governanceCurrent',
    painKey: 'governancePain',
    improveKey: 'governanceImprove',
    title: 'Decisions & teamwork',
  },
  {
    lens: 'knowledge-garden-resources',
    currentKey: 'knowledgeCurrent',
    painKey: 'knowledgePain',
    improveKey: 'knowledgeImprove',
    title: 'Knowledge & tools',
  },
] as const;

function listToMultiline(values: string[]) {
  return values.join('\n');
}

function multilineToList(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function createProfileEditForm(activeCoop: CoopSharedState) {
  return {
    name: activeCoop.profile.name,
    purpose: activeCoop.profile.purpose,
    captureMode: activeCoop.profile.captureMode,
  };
}

function createSoulEditForm(activeCoop: CoopSharedState) {
  const soul = activeCoop.soul;
  return {
    purposeStatement: soul?.purposeStatement ?? activeCoop.profile.purpose,
    whyThisCoopExists: soul?.whyThisCoopExists ?? '',
    usefulSignalDefinition: soul?.usefulSignalDefinition ?? '',
    toneAndWorkingStyle: soul?.toneAndWorkingStyle ?? '',
    artifactFocus: listToMultiline(soul?.artifactFocus ?? []),
  };
}

function createRitualEditForm(activeCoop: CoopSharedState): RitualEditFormState {
  const ritual = activeCoop.rituals[0];
  return {
    weeklyReviewCadence: ritual?.weeklyReviewCadence ?? '',
    namedMoments: listToMultiline(ritual?.namedMoments ?? []),
    facilitatorExpectation: ritual?.facilitatorExpectation ?? '',
    defaultCapturePosture: ritual?.defaultCapturePosture ?? '',
  };
}

function createSetupEditForm(activeCoop: CoopSharedState): SetupEditFormState {
  const lensById = new Map(
    (activeCoop.setupInsights?.lenses ?? []).map((lens) => [lens.lens, lens]),
  );

  return {
    summary: activeCoop.setupInsights?.summary ?? '',
    capitalCurrent: lensById.get('capital-formation')?.currentState ?? '',
    capitalPain: lensById.get('capital-formation')?.painPoints ?? '',
    capitalImprove: lensById.get('capital-formation')?.improvements ?? '',
    impactCurrent: lensById.get('impact-reporting')?.currentState ?? '',
    impactPain: lensById.get('impact-reporting')?.painPoints ?? '',
    impactImprove: lensById.get('impact-reporting')?.improvements ?? '',
    governanceCurrent: lensById.get('governance-coordination')?.currentState ?? '',
    governancePain: lensById.get('governance-coordination')?.painPoints ?? '',
    governanceImprove: lensById.get('governance-coordination')?.improvements ?? '',
    knowledgeCurrent: lensById.get('knowledge-garden-resources')?.currentState ?? '',
    knowledgePain: lensById.get('knowledge-garden-resources')?.painPoints ?? '',
    knowledgeImprove: lensById.get('knowledge-garden-resources')?.improvements ?? '',
  };
}

function buildSoulPatch(form: ReturnType<typeof createSoulEditForm>): CoreSoulPatch {
  return {
    purposeStatement: form.purposeStatement,
    whyThisCoopExists: form.whyThisCoopExists,
    usefulSignalDefinition: form.usefulSignalDefinition,
    toneAndWorkingStyle: form.toneAndWorkingStyle,
    artifactFocus: multilineToList(form.artifactFocus),
  };
}

function buildSetupInsightsPatch(
  form: SetupEditFormState,
  currentSetupInsights?: Pick<
    SetupInsights,
    'crossCuttingPainPoints' | 'crossCuttingOpportunities'
  >,
): SetupInsights {
  const lenses = setupLensFieldMap.map(({ lens, currentKey, painKey, improveKey }) => ({
    lens,
    currentState: form[currentKey].trim(),
    painPoints: form[painKey].trim(),
    improvements: form[improveKey].trim(),
  }));

  return {
    summary: form.summary.trim(),
    crossCuttingPainPoints: currentSetupInsights?.crossCuttingPainPoints ?? [],
    crossCuttingOpportunities: currentSetupInsights?.crossCuttingOpportunities ?? [],
    lenses,
  };
}

function NestProfileSection({
  activeCoop,
  updateCoopDetails,
}: {
  activeCoop: CoopSharedState;
  updateCoopDetails: SidepanelOrchestration['updateCoopDetails'];
}) {
  const [profileForm, setProfileForm] = useState(() => createProfileEditForm(activeCoop));

  useEffect(() => {
    setProfileForm(createProfileEditForm(activeCoop));
  }, [activeCoop]);

  const hasChanges =
    profileForm.name !== activeCoop.profile.name ||
    profileForm.purpose !== activeCoop.profile.purpose ||
    profileForm.captureMode !== activeCoop.profile.captureMode;

  return (
    <details className="panel-card collapsible-card">
      <summary>
        <h2>Edit Profile</h2>
      </summary>
      <div className="collapsible-card__content stack">
        <div className="field-grid">
          <label htmlFor="edit-profile-name">Coop name</label>
          <input
            id="edit-profile-name"
            value={profileForm.name}
            onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div className="field-grid">
          <label htmlFor="edit-profile-purpose">Purpose</label>
          <textarea
            id="edit-profile-purpose"
            value={profileForm.purpose}
            onChange={(e) => setProfileForm((f) => ({ ...f, purpose: e.target.value }))}
          />
        </div>
        <div className="field-grid">
          <label htmlFor="edit-profile-capture-mode">Round-up timing</label>
          <select
            id="edit-profile-capture-mode"
            value={profileForm.captureMode}
            onChange={(e) =>
              setProfileForm((f) => ({ ...f, captureMode: e.target.value as CaptureMode }))
            }
          >
            <option value="manual">Only when I choose</option>
            <option value="5-min">Every 5 min</option>
            <option value="10-min">Every 10 min</option>
            <option value="15-min">Every 15 min</option>
            <option value="30-min">Every 30 min</option>
            <option value="60-min">Every 60 min</option>
          </select>
        </div>
        <button
          className="primary-button"
          disabled={!hasChanges}
          onClick={() => {
            const profile: {
              name?: string;
              purpose?: string;
              captureMode?: CaptureMode;
            } = {};
            if (profileForm.name !== activeCoop.profile.name) profile.name = profileForm.name;
            if (profileForm.purpose !== activeCoop.profile.purpose) {
              profile.purpose = profileForm.purpose;
            }
            if (profileForm.captureMode !== activeCoop.profile.captureMode) {
              profile.captureMode = profileForm.captureMode;
            }
            void updateCoopDetails({ profile });
          }}
          type="button"
        >
          Save changes
        </button>
      </div>
    </details>
  );
}

function NestSoulSection({
  activeCoop,
  updateCoopDetails,
}: {
  activeCoop: CoopSharedState;
  updateCoopDetails: SidepanelOrchestration['updateCoopDetails'];
}) {
  const [soulForm, setSoulForm] = useState(() => createSoulEditForm(activeCoop));

  useEffect(() => {
    setSoulForm(createSoulEditForm(activeCoop));
  }, [activeCoop]);

  const initialSoul = createSoulEditForm(activeCoop);
  const hasChanges =
    JSON.stringify(buildSoulPatch(soulForm)) !== JSON.stringify(buildSoulPatch(initialSoul));

  return (
    <details className="panel-card collapsible-card">
      <summary>
        <h2>Edit Soul</h2>
      </summary>
      <div className="collapsible-card__content stack">
        <div className="field-grid">
          <label htmlFor="edit-soul-purpose">Purpose statement</label>
          <textarea
            id="edit-soul-purpose"
            value={soulForm.purposeStatement}
            onChange={(event) =>
              setSoulForm((current) => ({ ...current, purposeStatement: event.target.value }))
            }
          />
        </div>
        <div className="field-grid">
          <label htmlFor="edit-soul-why">Why this coop exists</label>
          <textarea
            id="edit-soul-why"
            value={soulForm.whyThisCoopExists}
            onChange={(event) =>
              setSoulForm((current) => ({ ...current, whyThisCoopExists: event.target.value }))
            }
          />
        </div>
        <div className="field-grid">
          <label htmlFor="edit-soul-signal">Useful signal definition</label>
          <textarea
            id="edit-soul-signal"
            value={soulForm.usefulSignalDefinition}
            onChange={(event) =>
              setSoulForm((current) => ({
                ...current,
                usefulSignalDefinition: event.target.value,
              }))
            }
          />
        </div>
        <div className="field-grid">
          <label htmlFor="edit-soul-tone">Tone and working style</label>
          <textarea
            id="edit-soul-tone"
            value={soulForm.toneAndWorkingStyle}
            onChange={(event) =>
              setSoulForm((current) => ({ ...current, toneAndWorkingStyle: event.target.value }))
            }
          />
        </div>
        <div className="field-grid">
          <label htmlFor="edit-soul-focus">Artifact focus</label>
          <textarea
            id="edit-soul-focus"
            value={soulForm.artifactFocus}
            onChange={(event) =>
              setSoulForm((current) => ({ ...current, artifactFocus: event.target.value }))
            }
          />
          <span className="helper-text">Use one line per focus area.</span>
        </div>
        <button
          className="primary-button"
          disabled={!hasChanges}
          onClick={() => {
            void updateCoopDetails({ soul: buildSoulPatch(soulForm) });
          }}
          type="button"
        >
          Save soul
        </button>
      </div>
    </details>
  );
}

function NestRitualSection({
  activeCoop,
  updateMeetingSettings,
}: {
  activeCoop: CoopSharedState;
  updateMeetingSettings: SidepanelOrchestration['updateMeetingSettings'];
}) {
  const [ritualForm, setRitualForm] = useState(() => createRitualEditForm(activeCoop));

  useEffect(() => {
    setRitualForm(createRitualEditForm(activeCoop));
  }, [activeCoop]);

  const initialRitual = createRitualEditForm(activeCoop);
  const hasChanges =
    JSON.stringify({
      ...ritualForm,
      namedMoments: multilineToList(ritualForm.namedMoments),
    }) !==
    JSON.stringify({
      ...initialRitual,
      namedMoments: multilineToList(initialRitual.namedMoments),
    });

  return (
    <details className="panel-card collapsible-card">
      <summary>
        <h2>Edit Ritual</h2>
      </summary>
      <div className="collapsible-card__content stack">
        <div className="field-grid">
          <label htmlFor="edit-ritual-cadence">Weekly review cadence</label>
          <input
            id="edit-ritual-cadence"
            value={ritualForm.weeklyReviewCadence}
            onChange={(event) =>
              setRitualForm((current) => ({
                ...current,
                weeklyReviewCadence: event.target.value,
              }))
            }
          />
        </div>
        <div className="field-grid">
          <label htmlFor="edit-ritual-moments">Named moments</label>
          <textarea
            id="edit-ritual-moments"
            value={ritualForm.namedMoments}
            onChange={(event) =>
              setRitualForm((current) => ({ ...current, namedMoments: event.target.value }))
            }
          />
          <span className="helper-text">Use one line per moment.</span>
        </div>
        <div className="field-grid">
          <label htmlFor="edit-ritual-facilitator">Facilitator expectation</label>
          <textarea
            id="edit-ritual-facilitator"
            value={ritualForm.facilitatorExpectation}
            onChange={(event) =>
              setRitualForm((current) => ({
                ...current,
                facilitatorExpectation: event.target.value,
              }))
            }
          />
        </div>
        <div className="field-grid">
          <label htmlFor="edit-ritual-posture">Default capture posture</label>
          <textarea
            id="edit-ritual-posture"
            value={ritualForm.defaultCapturePosture}
            onChange={(event) =>
              setRitualForm((current) => ({
                ...current,
                defaultCapturePosture: event.target.value,
              }))
            }
          />
        </div>
        <button
          className="primary-button"
          disabled={!hasChanges}
          onClick={() => {
            void updateMeetingSettings({
              weeklyReviewCadence: ritualForm.weeklyReviewCadence,
              namedMoments: multilineToList(ritualForm.namedMoments),
              facilitatorExpectation: ritualForm.facilitatorExpectation,
              defaultCapturePosture: ritualForm.defaultCapturePosture,
            });
          }}
          type="button"
        >
          Save ritual
        </button>
      </div>
    </details>
  );
}

function NestSetupSection({
  activeCoop,
  updateCoopDetails,
}: {
  activeCoop: CoopSharedState;
  updateCoopDetails: SidepanelOrchestration['updateCoopDetails'];
}) {
  const [setupForm, setSetupForm] = useState(() => createSetupEditForm(activeCoop));

  useEffect(() => {
    setSetupForm(createSetupEditForm(activeCoop));
  }, [activeCoop]);

  const initialSetup = createSetupEditForm(activeCoop);
  const hasChanges =
    JSON.stringify(buildSetupInsightsPatch(setupForm, activeCoop.setupInsights)) !==
    JSON.stringify(buildSetupInsightsPatch(initialSetup, activeCoop.setupInsights));

  return (
    <details className="panel-card collapsible-card">
      <summary>
        <h2>Edit Setup</h2>
      </summary>
      <div className="collapsible-card__content stack">
        <div className="field-grid">
          <label htmlFor="edit-setup-summary">Big picture</label>
          <textarea
            id="edit-setup-summary"
            value={setupForm.summary}
            onChange={(event) =>
              setSetupForm((current) => ({ ...current, summary: event.target.value }))
            }
          />
        </div>
        <div className="lens-grid">
          {setupLensFieldMap.map(({ currentKey, painKey, improveKey, title }) => (
            <div className="panel-card" key={title}>
              <h3>{title}</h3>
              <div className="field-grid">
                <label htmlFor={`edit-setup-${currentKey}`}>How do you handle this today?</label>
                <textarea
                  id={`edit-setup-${currentKey}`}
                  value={setupForm[currentKey]}
                  onChange={(event) =>
                    setSetupForm((current) => ({
                      ...current,
                      [currentKey]: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="field-grid">
                <label htmlFor={`edit-setup-${painKey}`}>What feels messy or hard?</label>
                <textarea
                  id={`edit-setup-${painKey}`}
                  value={setupForm[painKey]}
                  onChange={(event) =>
                    setSetupForm((current) => ({
                      ...current,
                      [painKey]: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="field-grid">
                <label htmlFor={`edit-setup-${improveKey}`}>What should get easier?</label>
                <textarea
                  id={`edit-setup-${improveKey}`}
                  value={setupForm[improveKey]}
                  onChange={(event) =>
                    setSetupForm((current) => ({
                      ...current,
                      [improveKey]: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
          ))}
        </div>
        <button
          className="primary-button"
          disabled={!hasChanges}
          onClick={() => {
            void updateCoopDetails({
              setupInsights: buildSetupInsightsPatch(setupForm, activeCoop.setupInsights),
            });
          }}
          type="button"
        >
          Save setup
        </button>
      </div>
    </details>
  );
}
