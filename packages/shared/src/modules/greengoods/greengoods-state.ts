import type { Address } from 'viem';
import type {
  GreenGoodsDomain,
  GreenGoodsGardenBootstrapOutput,
  GreenGoodsGardenState,
  GreenGoodsGardenSyncOutput,
  GreenGoodsMemberBinding,
  GreenGoodsMemberRole,
  Member,
  MemberOnchainAccount,
  SetupInsights,
} from '../../contracts/schema';
import { greenGoodsGardenStateSchema } from '../../contracts/schema';
import { nowIso, slugify, truncateWords, unique } from '../../utils';
import { greenGoodsDomainBitValue } from './greengoods-deployments';

export function toGreenGoodsDomainMask(domains: GreenGoodsDomain[]) {
  return unique(domains).reduce((mask, domain) => mask | greenGoodsDomainBitValue[domain], 0);
}

export function fromGreenGoodsDomainMask(mask: number): GreenGoodsDomain[] {
  return (Object.entries(greenGoodsDomainBitValue) as Array<[GreenGoodsDomain, number]>)
    .filter(([, bitValue]) => (mask & bitValue) === bitValue)
    .map(([domain]) => domain);
}

export function toGreenGoodsDomainValue(domain: GreenGoodsDomain) {
  switch (domain) {
    case 'solar':
      return 0;
    case 'agro':
      return 1;
    case 'edu':
      return 2;
    case 'waste':
      return 3;
  }
}

export function resolveGreenGoodsGapAdminChanges(input: {
  desiredAdmins: Address[];
  currentAdmins: Address[];
}) {
  const desired = unique(input.desiredAdmins.map((address) => address.toLowerCase()));
  const current = unique(input.currentAdmins.map((address) => address.toLowerCase()));

  return {
    addAdmins: input.desiredAdmins.filter((address) => !current.includes(address.toLowerCase())),
    removeAdmins: input.currentAdmins.filter((address) => !desired.includes(address.toLowerCase())),
  };
}

export function resolveGreenGoodsMemberRoles(member: Pick<Member, 'role'>): GreenGoodsMemberRole[] {
  return member.role === 'creator' || member.role === 'trusted'
    ? ['gardener', 'operator']
    : ['gardener'];
}

function areRoleSetsEqual(left: GreenGoodsMemberRole[], right: GreenGoodsMemberRole[]) {
  return (
    left.length === right.length &&
    left.every((role) => right.includes(role)) &&
    right.every((role) => left.includes(role))
  );
}

export function syncGreenGoodsMemberBindings(input: {
  current?: GreenGoodsGardenState;
  members: Member[];
  memberAccounts: MemberOnchainAccount[];
}): GreenGoodsMemberBinding[] {
  const existingByMemberId = new Map(
    (input.current?.memberBindings ?? []).map((binding) => [binding.memberId, binding]),
  );
  const accountByMemberId = new Map(
    input.memberAccounts.map((account) => [account.memberId, account]),
  );

  return input.members.map((member) => {
    const existing = existingByMemberId.get(member.id);
    const account = accountByMemberId.get(member.id);
    const desiredRoles = resolveGreenGoodsMemberRoles(member);
    const actorAddress = account?.accountAddress;
    const rolesUnchanged = existing ? areRoleSetsEqual(existing.desiredRoles, desiredRoles) : false;
    const addressUnchanged = existing?.actorAddress?.toLowerCase() === actorAddress?.toLowerCase();
    const preservedSynced =
      existing?.status === 'synced' && rolesUnchanged && Boolean(actorAddress) && addressUnchanged;

    return {
      memberId: member.id,
      actorAddress,
      syncedActorAddress: preservedSynced
        ? (existing?.syncedActorAddress ?? actorAddress)
        : existing?.syncedActorAddress,
      desiredRoles,
      currentRoles: existing?.currentRoles ?? [],
      status: actorAddress ? (preservedSynced ? 'synced' : 'pending-sync') : 'pending-account',
      lastSyncedAt: preservedSynced ? existing?.lastSyncedAt : undefined,
      lastError: preservedSynced ? existing?.lastError : undefined,
    };
  });
}

export type GreenGoodsGardenerBindingAction = {
  memberId: string;
  actionClass: 'green-goods-add-gardener' | 'green-goods-remove-gardener';
  gardenerAddress: Address;
  reason: string;
};

function bindingWantsGardener(binding: Pick<GreenGoodsMemberBinding, 'desiredRoles'>) {
  return binding.desiredRoles.includes('gardener');
}

function bindingHasGardener(binding: Pick<GreenGoodsMemberBinding, 'currentRoles'>) {
  return binding.currentRoles.includes('gardener');
}

function computeGreenGoodsBindingStatus(binding: GreenGoodsMemberBinding) {
  if (bindingWantsGardener(binding) && !binding.actorAddress) {
    return 'pending-account' as const;
  }

  const gardenerSynced =
    bindingWantsGardener(binding) &&
    bindingHasGardener(binding) &&
    binding.actorAddress?.toLowerCase() === binding.syncedActorAddress?.toLowerCase();
  const gardenerRemoved = !bindingWantsGardener(binding) && !bindingHasGardener(binding);

  return gardenerSynced || gardenerRemoved ? 'synced' : 'pending-sync';
}

export function resolveGreenGoodsGardenerBindingActions(input: {
  garden?: GreenGoodsGardenState;
}) {
  const actions: GreenGoodsGardenerBindingAction[] = [];
  const skippedMemberIds: string[] = [];

  for (const binding of input.garden?.memberBindings ?? []) {
    const wantsGardener = bindingWantsGardener(binding);
    const hasGardener = bindingHasGardener(binding);
    const actorAddress = binding.actorAddress as Address | undefined;
    const syncedActorAddress = binding.syncedActorAddress as Address | undefined;

    if (wantsGardener && !actorAddress) {
      skippedMemberIds.push(binding.memberId);
      continue;
    }

    if (
      wantsGardener &&
      hasGardener &&
      actorAddress &&
      syncedActorAddress &&
      actorAddress.toLowerCase() !== syncedActorAddress.toLowerCase()
    ) {
      actions.push({
        memberId: binding.memberId,
        actionClass: 'green-goods-remove-gardener',
        gardenerAddress: syncedActorAddress,
        reason: 'Remove the previous gardener address before syncing the new member account.',
      });
      actions.push({
        memberId: binding.memberId,
        actionClass: 'green-goods-add-gardener',
        gardenerAddress: actorAddress,
        reason: 'Add the latest member smart account as a gardener.',
      });
      continue;
    }

    if (wantsGardener && !hasGardener && actorAddress) {
      actions.push({
        memberId: binding.memberId,
        actionClass: 'green-goods-add-gardener',
        gardenerAddress: actorAddress,
        reason: 'Add the member smart account as a gardener.',
      });
      continue;
    }

    if (!wantsGardener && hasGardener && (syncedActorAddress ?? actorAddress)) {
      actions.push({
        memberId: binding.memberId,
        actionClass: 'green-goods-remove-gardener',
        gardenerAddress: (syncedActorAddress ?? actorAddress) as Address,
        reason: 'Remove the member smart account from the garden.',
      });
    }
  }

  return {
    actions,
    skippedMemberIds,
  };
}

export function applyGreenGoodsGardenerActionSuccess(input: {
  garden: GreenGoodsGardenState;
  memberId: string;
  actionClass: GreenGoodsGardenerBindingAction['actionClass'];
  gardenerAddress: Address;
  syncedAt?: string;
  txHash?: `0x${string}`;
  detail?: string;
}) {
  const syncedAt = input.syncedAt ?? nowIso();

  return updateGreenGoodsState(input.garden, {
    memberBindings: input.garden.memberBindings.map((binding) => {
      if (binding.memberId !== input.memberId) {
        return binding;
      }

      const currentRoles = new Set(binding.currentRoles);
      if (input.actionClass === 'green-goods-add-gardener') {
        currentRoles.add('gardener');
      } else {
        currentRoles.delete('gardener');
      }

      const nextBinding: GreenGoodsMemberBinding = {
        ...binding,
        currentRoles: [...currentRoles],
        syncedActorAddress:
          input.actionClass === 'green-goods-add-gardener'
            ? input.gardenerAddress
            : binding.syncedActorAddress?.toLowerCase() === input.gardenerAddress.toLowerCase()
              ? undefined
              : binding.syncedActorAddress,
        lastSyncedAt: syncedAt,
        lastError: undefined,
      };

      return {
        ...nextBinding,
        status: computeGreenGoodsBindingStatus(nextBinding),
      };
    }),
    lastMemberSyncAt: syncedAt,
    lastTxHash: input.txHash,
    statusNote: input.detail ?? input.garden.statusNote,
    lastError: undefined,
  });
}

export function applyGreenGoodsMemberBindingError(input: {
  garden: GreenGoodsGardenState;
  memberId: string;
  error: string;
}) {
  return updateGreenGoodsState(input.garden, {
    memberBindings: input.garden.memberBindings.map((binding) =>
      binding.memberId === input.memberId
        ? {
            ...binding,
            status: 'error',
            lastError: input.error,
          }
        : binding,
    ),
  });
}

function deriveGreenGoodsDomainsFromText(input: {
  purpose: string;
  setupInsights: SetupInsights;
}): GreenGoodsDomain[] {
  const haystack = [
    input.purpose,
    input.setupInsights.summary,
    ...input.setupInsights.crossCuttingPainPoints,
    ...input.setupInsights.crossCuttingOpportunities,
    ...input.setupInsights.lenses.flatMap((lens) => [
      lens.currentState,
      lens.painPoints,
      lens.improvements,
    ]),
  ]
    .join(' ')
    .toLowerCase();

  const domains = new Set<GreenGoodsDomain>();

  if (/(solar|energy|microgrid|battery|renewable)/i.test(haystack)) {
    domains.add('solar');
  }
  if (
    /(agro|soil|farm|food|garden|forest|watershed|bioregion|ecology|restoration|regenerative|agriculture|water)/i.test(
      haystack,
    )
  ) {
    domains.add('agro');
  }
  if (
    /(edu|education|research|learning|training|knowledge|curriculum|library|documentation)/i.test(
      haystack,
    )
  ) {
    domains.add('edu');
  }
  if (/(waste|circular|compost|recycling|reuse|repair|landfill)/i.test(haystack)) {
    domains.add('waste');
  }

  return unique(domains.size > 0 ? [...domains] : ['agro']);
}

function normalizeOptionalGardenText(value?: string): string {
  const trimmed = value?.trim();
  return trimmed || '';
}

export function createInitialGreenGoodsState(input: {
  coopName: string;
  purpose: string;
  setupInsights: SetupInsights;
  requestedAt?: string;
}): GreenGoodsGardenState {
  const domains = deriveGreenGoodsDomainsFromText({
    purpose: input.purpose,
    setupInsights: input.setupInsights,
  });
  const requestedAt = input.requestedAt ?? nowIso();

  return greenGoodsGardenStateSchema.parse({
    enabled: true,
    status: 'requested',
    requestedAt,
    name: truncateWords(input.coopName.trim(), 12),
    slug: slugify(input.coopName).slice(0, 48) || undefined,
    description: truncateWords(input.purpose.trim(), 48),
    location: '',
    bannerImage: '',
    metadata: '',
    openJoining: false,
    maxGardeners: 0,
    weightScheme: 'linear',
    domains,
    domainMask: toGreenGoodsDomainMask(domains),
    statusNote: 'Green Goods garden requested and awaiting trusted-node execution.',
  });
}

export function updateGreenGoodsState(
  current: GreenGoodsGardenState | undefined,
  patch: Partial<GreenGoodsGardenState>,
): GreenGoodsGardenState {
  const domains = patch.domains ?? current?.domains ?? [];
  return greenGoodsGardenStateSchema.parse({
    ...current,
    ...patch,
    domains,
    domainMask: patch.domainMask ?? toGreenGoodsDomainMask(domains),
  });
}

export function buildGreenGoodsGardenBootstrap(input: {
  garden: GreenGoodsGardenState;
  coopSafeAddress: Address;
  operatorAddresses: Address[];
  gardenerAddresses: Address[];
}) {
  return {
    name: input.garden.name,
    slug: input.garden.slug ?? '',
    description: input.garden.description,
    location: normalizeOptionalGardenText(input.garden.location),
    bannerImage: normalizeOptionalGardenText(input.garden.bannerImage),
    metadata: normalizeOptionalGardenText(input.garden.metadata),
    openJoining: input.garden.openJoining,
    maxGardeners: input.garden.maxGardeners,
    weightScheme: input.garden.weightScheme,
    domains: input.garden.domains,
    rationale: `Bootstrap a Green Goods garden owned by coop Safe ${input.coopSafeAddress}.`,
    operators: unique(input.operatorAddresses),
    gardeners: unique(input.gardenerAddresses),
  };
}

export function createGreenGoodsBootstrapOutput(input: {
  coopName: string;
  purpose: string;
  garden: GreenGoodsGardenState;
}): GreenGoodsGardenBootstrapOutput {
  return {
    name: input.garden.name || truncateWords(input.coopName, 12),
    slug: input.garden.slug,
    description: input.garden.description || truncateWords(input.purpose, 48),
    location: normalizeOptionalGardenText(input.garden.location),
    bannerImage: normalizeOptionalGardenText(input.garden.bannerImage),
    metadata: normalizeOptionalGardenText(input.garden.metadata),
    openJoining: input.garden.openJoining,
    maxGardeners: input.garden.maxGardeners,
    weightScheme: input.garden.weightScheme,
    domains: input.garden.domains,
    rationale: 'Coop launch requested a Green Goods garden and the coop Safe is available.',
  };
}

export function createGreenGoodsSyncOutput(input: {
  garden: GreenGoodsGardenState;
  coopName: string;
  purpose: string;
}): GreenGoodsGardenSyncOutput {
  return {
    name: input.garden.name || truncateWords(input.coopName, 12),
    description: input.garden.description || truncateWords(input.purpose, 48),
    location: normalizeOptionalGardenText(input.garden.location),
    bannerImage: normalizeOptionalGardenText(input.garden.bannerImage),
    metadata: normalizeOptionalGardenText(input.garden.metadata),
    openJoining: input.garden.openJoining,
    maxGardeners: input.garden.maxGardeners,
    domains: input.garden.domains,
    ensurePools: true,
    rationale: 'Garden metadata and domain configuration should match the coop state.',
  };
}

export function createGreenGoodsGapAdminSyncOutput(input: {
  desiredAdmins: Address[];
  currentAdmins: Address[];
}) {
  const changes = resolveGreenGoodsGapAdminChanges(input);
  return {
    addAdmins: changes.addAdmins,
    removeAdmins: changes.removeAdmins,
    rationale:
      changes.addAdmins.length > 0 || changes.removeAdmins.length > 0
        ? 'Align Karma GAP project admins with current trusted coop operators.'
        : 'Karma GAP project admins already match the trusted coop operators.',
  };
}
