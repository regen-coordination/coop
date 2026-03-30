import type { ExtensionIconState } from '../../contracts/schema';

export interface IconStateInput {
  hasCoop: boolean;
  agentActive: boolean;
  pendingAttention: number;
  blocked: boolean;
}

/**
 * Derive the extension icon state from runtime signals.
 *
 * Priority (highest wins):
 *  1. blocked  — critical issue preventing usage (red)
 *  2. setup    — no coop exists yet (muted green)
 *  3. attention — items waiting for the user (orange)
 *  4. working  — agent actively processing (blue)
 *  5. ready    — healthy, nothing to do (green)
 */
export function deriveExtensionIconState(input: IconStateInput): ExtensionIconState {
  if (input.blocked) return 'blocked';
  if (!input.hasCoop) return 'setup';
  if (input.pendingAttention > 0) return 'attention';
  if (input.agentActive) return 'working';
  return 'ready';
}

export function extensionIconStateLabel(state: ExtensionIconState) {
  switch (state) {
    case 'setup':
      return 'Setup';
    case 'ready':
      return 'Ready';
    case 'working':
      return 'Working';
    case 'attention':
      return 'Attention';
    case 'blocked':
      return 'Blocked';
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

export function extensionIconBadge(state: ExtensionIconState) {
  switch (state) {
    case 'setup':
      return { text: '', color: '#5a7d10' };
    case 'ready':
      return { text: '', color: '#5a7d10' };
    case 'working':
      return { text: '', color: '#3b82f6' };
    case 'attention':
      return { text: '', color: '#fd8a01' };
    case 'blocked':
      return { text: '!', color: '#a63b20' };
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}
