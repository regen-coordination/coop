import type { DashboardResponse } from '../../../runtime/messages';
import {
  formatSavedProofMode,
  formatSavedProofScope,
  getAnchorExplorerUrl,
  getFilfoxDealUrl,
  getFilfoxProviderUrl,
  getFvmExplorerTxUrl,
  truncateCid,
} from '../helpers';

export interface ArchiveReceiptCardProps {
  receipt: ReturnType<typeof import('@coop/shared').describeArchiveReceipt>;
  runtimeConfig: DashboardResponse['runtimeConfig'];
  liveArchiveAvailable: boolean;
  refreshArchiveStatus: (receiptId?: string) => Promise<void>;
  onAnchorOnChain: (receiptId: string) => void;
  onFvmRegister?: (receiptId: string) => void;
}

const FILECOIN_LIFECYCLE_STEPS = ['pending', 'offered', 'indexed', 'sealed'] as const;

function FilecoinLifecycleBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    pending: 'Uploaded',
    offered: 'Offered',
    indexed: 'Indexed',
    sealed: 'Sealed',
  };
  return (
    <div className="badge-row" style={{ gap: '0.25rem' }}>
      {FILECOIN_LIFECYCLE_STEPS.map((step) => {
        const isActive =
          FILECOIN_LIFECYCLE_STEPS.indexOf(step) <=
          FILECOIN_LIFECYCLE_STEPS.indexOf(status as (typeof FILECOIN_LIFECYCLE_STEPS)[number]);
        return (
          <span
            key={step}
            className="badge"
            style={{
              opacity: isActive ? 1 : 0.4,
              fontWeight: step === status ? 'bold' : 'normal',
            }}
          >
            {labels[step] ?? step}
          </span>
        );
      })}
    </div>
  );
}

export function ArchiveReceiptCard({
  receipt,
  runtimeConfig,
  liveArchiveAvailable,
  refreshArchiveStatus,
  onAnchorOnChain,
  onFvmRegister,
}: ArchiveReceiptCardProps) {
  return (
    <article className="draft-card stack" key={receipt.id}>
      <div className="badge-row">
        <span className="badge">{formatSavedProofScope(receipt.scope)}</span>
        <span className="badge">{formatSavedProofMode(receipt.delegationMode)}</span>
      </div>
      <FilecoinLifecycleBadge status={receipt.filecoinStatus} />
      <strong>{receipt.title}</strong>
      <div className="helper-text">{receipt.purpose}</div>
      <div className="helper-text">{receipt.summary}</div>
      <div className="detail-grid archive-detail-grid">
        <div>
          <strong>Open saved bundle</strong>
          <div className="helper-text">
            <a className="source-link" href={receipt.gatewayUrl} rel="noreferrer" target="_blank">
              {receipt.gatewayUrl}
            </a>
          </div>
        </div>
        <div>
          <strong>Save ID</strong>
          <div className="helper-text">{receipt.rootCid}</div>
        </div>
        <div>
          <strong>Saved</strong>
          <div className="helper-text">{new Date(receipt.uploadedAt).toLocaleString()}</div>
        </div>
        <div>
          <strong>Items saved</strong>
          <div className="helper-text">{receipt.itemCount} item(s)</div>
        </div>
        <div>
          <strong>Storage piece</strong>
          <div className="helper-text" title={receipt.primaryPieceCid ?? undefined}>
            {receipt.primaryPieceCid ? truncateCid(receipt.primaryPieceCid) : 'Not reported yet'}
          </div>
        </div>
        <div>
          <strong>Save source</strong>
          <div className="helper-text">{receipt.delegationSource ?? receipt.delegationIssuer}</div>
        </div>
        <div>
          <strong>Deep-save check</strong>
          <div className="helper-text">
            {receipt.dealCount > 0
              ? `${receipt.dealCount} deal(s) tracked`
              : receipt.aggregateCount > 0
                ? `${receipt.aggregateCount} aggregate(s) tracked`
                : 'No deep-save data yet'}
          </div>
        </div>
      </div>
      {receipt.filecoinDeals.length > 0 ? (
        <div>
          <strong>Filecoin deals</strong>
          {receipt.filecoinDeals.map((deal, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: deals have no stable unique key beyond index
            <div className="helper-text" key={i} style={{ marginLeft: '0.5rem' }}>
              {deal.provider ? (
                <a
                  className="source-link"
                  href={getFilfoxProviderUrl(deal.provider)}
                  rel="noreferrer"
                  target="_blank"
                >
                  {deal.provider}
                </a>
              ) : (
                <span>No provider yet</span>
              )}
              {deal.dealId ? (
                <>
                  {' '}
                  <a
                    className="source-link"
                    href={getFilfoxDealUrl(deal.dealId)}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Deal #{deal.dealId}
                  </a>
                </>
              ) : null}
              <span title={deal.aggregate}> ({truncateCid(deal.aggregate)})</span>
              <span className="badge" style={{ marginLeft: '0.25rem' }}>
                Sealed
              </span>
            </div>
          ))}
        </div>
      ) : null}
      {receipt.filecoinAggregates.length > 0 ? (
        <div>
          <strong>Aggregates</strong>
          {receipt.filecoinAggregates.map((agg, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: aggregates have no stable unique key beyond index
            <div className="helper-text" key={i} style={{ marginLeft: '0.5rem' }}>
              <span title={agg.aggregate}>{truncateCid(agg.aggregate)}</span>
              <span className="badge" style={{ marginLeft: '0.25rem' }}>
                {agg.inclusionProofAvailable ? 'Proof available' : 'Proof pending'}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      <div className="helper-text">
        {receipt.lastRefreshedAt
          ? `Last deep-save check ${new Date(receipt.lastRefreshedAt).toLocaleString()}`
          : 'No deep-save check yet.'}
      </div>
      {receipt.filecoinInfoLastUpdatedAt ? (
        <div className="helper-text">
          Filecoin info updated {new Date(receipt.filecoinInfoLastUpdatedAt).toLocaleString()}
        </div>
      ) : null}
      {receipt.lastRefreshError ? (
        <div className="helper-text">
          Latest deep-save check had trouble: {receipt.lastRefreshError}
        </div>
      ) : null}
      {receipt.delegationMode === 'live' && receipt.filecoinStatus !== 'sealed' ? (
        <div className="action-row">
          <button
            className="secondary-button"
            disabled={!liveArchiveAvailable}
            onClick={() => void refreshArchiveStatus(receipt.id)}
            type="button"
          >
            Refresh deep-save check
          </button>
        </div>
      ) : null}
      {receipt.anchorTxHash ? (
        <a
          className="badge anchor-badge source-link"
          href={getAnchorExplorerUrl(receipt.anchorTxHash, receipt.anchorChainKey ?? 'sepolia')}
          rel="noreferrer"
          target="_blank"
        >
          Anchored ({receipt.anchorChainKey ?? 'unknown chain'})
        </a>
      ) : receipt.delegationMode === 'live' &&
        !receipt.anchorTxHash &&
        runtimeConfig.onchainMode === 'live' ? (
        <div className="action-row">
          <button
            className="secondary-button"
            onClick={() => onAnchorOnChain(receipt.id)}
            type="button"
          >
            Anchor on-chain
          </button>
        </div>
      ) : null}
      {receipt.fvmRegistryTxHash ? (
        <a
          className="badge anchor-badge source-link"
          href={getFvmExplorerTxUrl(
            receipt.fvmRegistryTxHash,
            (receipt.fvmChainKey ?? 'filecoin-calibration') as 'filecoin' | 'filecoin-calibration',
          )}
          rel="noreferrer"
          target="_blank"
        >
          Registered on Filecoin ({receipt.fvmChainKey === 'filecoin' ? 'mainnet' : 'calibration'})
        </a>
      ) : onFvmRegister && receipt.delegationMode === 'live' && !receipt.fvmRegistryTxHash ? (
        <div className="action-row">
          <button
            className="secondary-button"
            onClick={() => onFvmRegister(receipt.id)}
            type="button"
          >
            Register on Filecoin
          </button>
        </div>
      ) : null}
    </article>
  );
}
