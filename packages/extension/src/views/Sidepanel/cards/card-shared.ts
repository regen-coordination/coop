import type { ReviewDraft } from '@coop/shared';
import type { useDraftEditor } from '../hooks/useDraftEditor';

export type DraftEditorReturn = ReturnType<typeof useDraftEditor>;

export function formatRelativeTime(timestamp?: string) {
  if (!timestamp) {
    return 'Just now';
  }

  const elapsed = Date.now() - new Date(timestamp).getTime();
  if (Number.isNaN(elapsed) || elapsed < 0) {
    return 'Just now';
  }

  const minutes = Math.round(elapsed / 60000);
  if (minutes < 1) {
    return 'Just now';
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function formatConfidence(value: number) {
  return `${Math.round(value * 100)}% match`;
}

export function formatDraftStageLabel(stage: ReviewDraft['workflowStage']) {
  return stage === 'ready' ? 'ready to share' : 'hatching';
}

export function formatProvenanceLabel(provenance: ReviewDraft['provenance']) {
  switch (provenance.type) {
    case 'tab':
      return 'tab signal';
    case 'agent':
      return 'agent insight';
    case 'receiver':
      return 'pocket coop';
    default:
      return 'draft';
  }
}

export function summarizeSourceLine(url?: string, domain?: string, count = 0) {
  let sourceLabel = domain || 'Local note';
  if (!domain && url) {
    try {
      sourceLabel = new URL(url).hostname.replace(/^www\./, '') || url;
    } catch {
      sourceLabel = url;
    }
  }
  if (count <= 1) {
    return sourceLabel;
  }
  return `${sourceLabel} +${count - 1} source${count - 1 === 1 ? '' : 's'}`;
}
