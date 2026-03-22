import {
  type ActionBundle,
  type CoopSharedState,
  formatMemberAccountStatus,
  formatMemberAccountType,
} from '@coop/shared';
import { useState } from 'react';

// ---------------------------------------------------------------------------
// Prop types
// ---------------------------------------------------------------------------

export interface GreenGoodsAccessSummaryProps {
  activeCoop: CoopSharedState;
  memberAccount: CoopSharedState['memberAccounts'][number] | undefined;
  memberBinding: { status: string; actorAddress?: string; lastSyncedAt?: string } | undefined;
  memberGardenerBundles: ActionBundle[];
}

export interface GreenGoodsImpactReportFormProps {
  onSubmit: (input: {
    title: string;
    description: string;
    domain: 'solar' | 'agro' | 'edu' | 'waste';
    reportCid: string;
    metricsSummary: string;
    reportingPeriodStart: number;
    reportingPeriodEnd: number;
  }) => Promise<void>;
}

export interface GreenGoodsWorkSubmissionFormProps {
  onSubmit: (input: {
    actionUid: number;
    title: string;
    feedback: string;
    metadataCid: string;
    mediaCids: string[];
  }) => Promise<void>;
}

export interface GreenGoodsProvisionButtonProps {
  memberAccount: CoopSharedState['memberAccounts'][number] | undefined;
  gardenAddress: string | undefined;
  canSubmit: boolean;
  onProvision: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// GreenGoodsAccessSummary
// ---------------------------------------------------------------------------

export function GreenGoodsAccessSummary({
  activeCoop,
  memberAccount,
  memberBinding,
  memberGardenerBundles,
}: GreenGoodsAccessSummaryProps) {
  return (
    <div className="stack">
      <div className="summary-strip">
        <div className="summary-card">
          <span>Garden link</span>
          <strong>{activeCoop.greenGoods?.gardenAddress ? 'Linked' : 'Waiting'}</strong>
        </div>
        <div className="summary-card">
          <span>Your garden account</span>
          <strong>
            {memberAccount ? formatMemberAccountStatus(memberAccount.status) : 'Not provisioned'}
          </strong>
        </div>
        <div className="summary-card">
          <span>Binding</span>
          <strong>{memberBinding?.status ?? 'pending-account'}</strong>
        </div>
        <div className="summary-card">
          <span>Garden sync queue</span>
          <strong>
            {memberGardenerBundles.length > 0
              ? `${memberGardenerBundles.length} queued`
              : memberBinding?.status === 'pending-sync'
                ? 'Waiting'
                : memberBinding?.status === 'synced'
                  ? 'Synced'
                  : memberBinding?.status === 'error'
                    ? 'Needs retry'
                    : 'Not queued'}
          </strong>
        </div>
      </div>
      <div className="detail-grid">
        <div>
          <strong>Garden</strong>
          <p className="helper-text">
            {activeCoop.greenGoods?.gardenAddress ?? 'No garden address yet.'}
          </p>
        </div>
        <div>
          <strong>Account type</strong>
          <p className="helper-text">
            {memberAccount
              ? formatMemberAccountType(memberAccount.accountType)
              : 'Safe smart account'}
          </p>
        </div>
        <div>
          <strong>Predicted actor address</strong>
          <p className="helper-text">
            {memberAccount?.accountAddress ??
              memberBinding?.actorAddress ??
              'Provision this browser to derive your member smart account.'}
          </p>
        </div>
        <div>
          <strong>Status note</strong>
          <p className="helper-text">
            {memberAccount?.statusNote ??
              'Your member garden account will lazy-deploy on the first live transaction.'}
          </p>
        </div>
        <div>
          <strong>Last garden sync</strong>
          <p className="helper-text">
            {memberBinding?.lastSyncedAt
              ? new Date(memberBinding.lastSyncedAt).toLocaleString()
              : memberBinding?.status === 'pending-sync'
                ? 'Waiting for a trusted operator to sync this member into the garden.'
                : 'No completed garden sync yet.'}
          </p>
        </div>
        <div>
          <strong>Recent member activity</strong>
          <p className="helper-text">
            {activeCoop.greenGoods?.lastWorkSubmissionAt
              ? `Work submission ${new Date(activeCoop.greenGoods.lastWorkSubmissionAt).toLocaleString()}`
              : activeCoop.greenGoods?.lastImpactReportAt
                ? `Impact report ${new Date(activeCoop.greenGoods.lastImpactReportAt).toLocaleString()}`
                : 'No member attestations recorded yet.'}
          </p>
        </div>
      </div>
      {memberGardenerBundles.length > 0 ? (
        <div className="operator-log-list">
          {memberGardenerBundles.map((bundle) => (
            <article className="operator-log-entry" key={bundle.id}>
              <div className="badge-row">
                <span className="badge">{bundle.status}</span>
                <span className="badge">
                  {bundle.actionClass === 'green-goods-add-gardener'
                    ? 'Add gardener'
                    : 'Remove gardener'}
                </span>
              </div>
              <strong>{bundle.payload.gardenerAddress as string}</strong>
              <div className="helper-text">
                Queued {new Date(bundle.createdAt).toLocaleString()}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// GreenGoodsImpactReportForm
// ---------------------------------------------------------------------------

export function GreenGoodsImpactReportForm({ onSubmit }: GreenGoodsImpactReportFormProps) {
  const [draft, setDraft] = useState({
    title: '',
    description: '',
    domain: 'agro' as 'solar' | 'agro' | 'edu' | 'waste',
    reportCid: '',
    metricsSummary: '',
    reportingPeriodStart: '',
    reportingPeriodEnd: '',
  });

  return (
    <form
      className="form-grid"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit({
          title: draft.title,
          description: draft.description,
          domain: draft.domain,
          reportCid: draft.reportCid,
          metricsSummary: draft.metricsSummary,
          reportingPeriodStart: Number(draft.reportingPeriodStart),
          reportingPeriodEnd: Number(draft.reportingPeriodEnd),
        });
      }}
    >
      <strong>Impact report</strong>
      <div className="field-grid">
        <label htmlFor="impact-title">Impact report title</label>
        <input
          id="impact-title"
          required
          value={draft.title}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              title: event.target.value,
            }))
          }
        />
      </div>
      <div className="field-grid">
        <label htmlFor="impact-description">What changed?</label>
        <textarea
          id="impact-description"
          required
          value={draft.description}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              description: event.target.value,
            }))
          }
        />
      </div>
      <div className="detail-grid">
        <div className="field-grid">
          <label htmlFor="impact-domain">Domain</label>
          <select
            id="impact-domain"
            value={draft.domain}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                domain: event.target.value as 'solar' | 'agro' | 'edu' | 'waste',
              }))
            }
          >
            <option value="solar">solar</option>
            <option value="agro">agro</option>
            <option value="edu">edu</option>
            <option value="waste">waste</option>
          </select>
        </div>
        <div className="field-grid">
          <label htmlFor="impact-cid">Report CID</label>
          <input
            id="impact-cid"
            required
            value={draft.reportCid}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                reportCid: event.target.value,
              }))
            }
          />
        </div>
      </div>
      <div className="field-grid">
        <label htmlFor="impact-metrics">Metrics summary</label>
        <textarea
          id="impact-metrics"
          required
          value={draft.metricsSummary}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              metricsSummary: event.target.value,
            }))
          }
        />
      </div>
      <div className="detail-grid">
        <div className="field-grid">
          <label htmlFor="impact-start">Period start (unix seconds)</label>
          <input
            id="impact-start"
            min="0"
            required
            type="number"
            value={draft.reportingPeriodStart}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                reportingPeriodStart: event.target.value,
              }))
            }
          />
        </div>
        <div className="field-grid">
          <label htmlFor="impact-end">Period end (unix seconds)</label>
          <input
            id="impact-end"
            min="0"
            required
            type="number"
            value={draft.reportingPeriodEnd}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                reportingPeriodEnd: event.target.value,
              }))
            }
          />
        </div>
      </div>
      <div className="action-row">
        <button className="primary-button" type="submit">
          Submit impact from my account
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// GreenGoodsWorkSubmissionForm
// ---------------------------------------------------------------------------

export function GreenGoodsWorkSubmissionForm({ onSubmit }: GreenGoodsWorkSubmissionFormProps) {
  const [draft, setDraft] = useState({
    actionUid: '6',
    title: '',
    feedback: '',
    metadataCid: '',
    mediaCids: '',
  });

  return (
    <form
      className="form-grid"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit({
          actionUid: Number(draft.actionUid),
          title: draft.title,
          feedback: draft.feedback,
          metadataCid: draft.metadataCid,
          mediaCids: draft.mediaCids
            .split(/[\n,]+/)
            .map((value) => value.trim())
            .filter(Boolean),
        });
      }}
    >
      <strong>Work submission</strong>
      <div className="field-grid">
        <label htmlFor="work-action-uid">Action UID</label>
        <input
          id="work-action-uid"
          min="0"
          required
          type="number"
          value={draft.actionUid}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              actionUid: event.target.value,
            }))
          }
        />
      </div>
      <div className="field-grid">
        <label htmlFor="work-title">Submission title</label>
        <input
          id="work-title"
          required
          value={draft.title}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              title: event.target.value,
            }))
          }
        />
      </div>
      <div className="field-grid">
        <label htmlFor="work-feedback">Feedback</label>
        <textarea
          id="work-feedback"
          value={draft.feedback}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              feedback: event.target.value,
            }))
          }
        />
      </div>
      <div className="field-grid">
        <label htmlFor="work-metadata-cid">Metadata CID</label>
        <input
          id="work-metadata-cid"
          required
          value={draft.metadataCid}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              metadataCid: event.target.value,
            }))
          }
        />
      </div>
      <div className="field-grid">
        <label htmlFor="work-media-cids">Media CIDs</label>
        <textarea
          id="work-media-cids"
          placeholder="One CID per line or comma-separated"
          value={draft.mediaCids}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              mediaCids: event.target.value,
            }))
          }
        />
      </div>
      <div className="action-row">
        <button className="primary-button" type="submit">
          Submit work submission
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// GreenGoodsProvisionButton
// ---------------------------------------------------------------------------

export function GreenGoodsProvisionButton({
  memberAccount,
  gardenAddress,
  canSubmit,
  onProvision,
}: GreenGoodsProvisionButtonProps) {
  return (
    <>
      <div className="action-row">
        <button className="primary-button" onClick={() => void onProvision()} type="button">
          {memberAccount?.accountAddress
            ? 'Refresh local garden account'
            : 'Provision my garden account'}
        </button>
      </div>
      {!canSubmit ? (
        <p className="helper-text">
          {gardenAddress
            ? 'Provision your local garden account first. Once the address is predicted, this browser can submit impact and work submissions directly from your member smart account.'
            : 'Wait for the coop garden to be linked before submitting member attestations.'}
        </p>
      ) : null}
    </>
  );
}
