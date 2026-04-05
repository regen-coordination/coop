import type { ActionBundle } from '@coop/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function isGardenerActionBundle(bundle: ActionBundle) {
  return (
    bundle.actionClass === 'green-goods-add-gardener' ||
    bundle.actionClass === 'green-goods-remove-gardener'
  );
}

export function readBundleTargetMemberId(bundle: ActionBundle) {
  const targetMemberId = bundle.payload.memberId;
  return typeof targetMemberId === 'string' && targetMemberId.length > 0
    ? targetMemberId
    : undefined;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Garden stage
// ---------------------------------------------------------------------------

export type GardenStage =
  | 'no-greengoods'
  | 'disabled'
  | 'requested'
  | 'provisioning'
  | 'needs-account'
  | 'pending-sync'
  | 'ready'
  | 'error';

export const GARDEN_STAGE_COPY: Record<
  GardenStage,
  { title: string; description: string; action?: string }
> = {
  'no-greengoods': {
    title: 'Garden',
    description:
      "This coop doesn\u2019t have Green Goods set up yet. The coop creator can enable Green Goods when editing coop settings in the Nest tab.",
  },
  disabled: {
    title: 'Garden',
    description:
      'Green Goods is not enabled for this coop. The coop creator can enable it in Nest \u2192 Settings to start tracking verifiable impact work.',
  },
  requested: {
    title: 'Garden Requested',
    description:
      'A garden has been requested for this coop. The operator agent will provision it \u2014 this usually happens within one agent cycle.',
    action: 'Waiting for agent\u2026',
  },
  provisioning: {
    title: 'Garden Provisioning',
    description:
      'Your garden is being set up on-chain. This may take a few minutes while the transaction confirms.',
    action: 'Provisioning\u2026',
  },
  'needs-account': {
    title: 'Garden is Live',
    description:
      "Your coop\u2019s garden is linked. Provision your member account to start submitting impact work.",
  },
  'pending-sync': {
    title: 'Almost There',
    description:
      'Your account is provisioned. Waiting for a trusted operator to sync your membership into the garden.',
    action: 'Waiting for operator sync\u2026',
  },
  ready: {
    title: 'Green Goods',
    description: '',
  },
  error: {
    title: 'Garden Issue',
    description:
      'Something went wrong with the garden setup. Check the Nest \u2192 Agent tab for details, or try running the agent cycle again.',
  },
};
