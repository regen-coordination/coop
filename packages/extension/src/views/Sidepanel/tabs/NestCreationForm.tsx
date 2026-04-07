import type { CaptureMode, CoopSpaceType } from '@coop/shared';
import {
  passkeyTrustDetail,
  passkeyTrustLabel,
  purposeCreateHelperText,
} from '../../shared/coop-copy';
import type { useCoopForm } from '../hooks/useCoopForm';
import type { CreateFormState } from '../setup-insights';

// ---------------------------------------------------------------------------
// Shared hook return types
// ---------------------------------------------------------------------------

type CoopFormReturn = ReturnType<typeof useCoopForm>;

// ---------------------------------------------------------------------------
// NestCreationForm
// ---------------------------------------------------------------------------

export interface NestCreationFormProps {
  coopForm: CoopFormReturn;
}

export function NestCreationForm({ coopForm }: NestCreationFormProps) {
  return (
    <>
      <article className="panel-card">
        <h2>Start a Coop</h2>
        <p className="helper-text">
          Start with a name, your passkey-backed member seat, and a few sentences about what the
          coop is for. Coop will shape the rest from there.
        </p>
        <form className="form-grid" onSubmit={coopForm.createCoopAction}>
          <div className="detail-grid">
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
              <span className="helper-text" title={passkeyTrustDetail}>
                {passkeyTrustLabel}
              </span>
            </div>
          </div>

          <div className="field-grid">
            <label htmlFor="coop-purpose">Purpose</label>
            <textarea
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
            <span className="helper-text">{purposeCreateHelperText}</span>
          </div>

          <details className="panel-card collapsible-card">
            <summary>Advanced setup (optional)</summary>
            <div className="collapsible-card__content stack">
              <p className="helper-text">
                Leave this closed for the quick path. These settings only tune the default coop
                shape and can be refined later.
              </p>
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
                  value={coopForm.createForm.summary}
                />
                <span className="helper-text">
                  Optional context for setup insights. One or two sentences is enough.
                </span>
              </div>
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
                <span className="helper-text">Optional — connect a garden later if needed.</span>
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

      <article className="panel-card">
        <h2>Join a Coop</h2>
        <p className="helper-text">
          Already have an invite? Add it here to join an existing coop from a fresh browser.
        </p>
        <p className="helper-text" title={passkeyTrustDetail}>
          {passkeyTrustLabel}
        </p>
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
      </article>
    </>
  );
}
