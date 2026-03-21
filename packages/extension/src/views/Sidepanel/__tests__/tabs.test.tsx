import { type ActionBundle, getCoopSpacePreset, listCoopSpacePresets } from '@coop/shared';
import { render, screen } from '@testing-library/react';
import type { FormEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { initialCreateForm } from '../setup-insights';
import { NestTab } from '../tabs';

const noop = vi.fn();

function createNestProps() {
  return {
    activeCoop: {
      profile: {
        id: 'coop-1',
        name: 'Coop Town',
        purpose: 'Coordinate garden work and reporting.',
        spaceType: 'community',
      },
      onchainState: {
        safeAddress: '0x9999999999999999999999999999999999999999',
        chainKey: 'sepolia',
        statusNote: 'Safe deployed.',
      },
      members: [
        {
          id: 'member-1',
          displayName: 'Mina',
          address: '0x1111111111111111111111111111111111111111',
          role: 'member',
        },
      ],
      memberAccounts: [
        {
          id: 'macct-1',
          memberId: 'member-1',
          coopId: 'coop-1',
          accountAddress: '0x2222222222222222222222222222222222222222',
          accountType: 'safe',
          ownerPasskeyCredentialId: 'cred-1',
          chainKey: 'sepolia',
          status: 'predicted',
          statusNote: 'Counterfactual address ready.',
          createdAt: '2026-03-20T00:00:00.000Z',
          updatedAt: '2026-03-20T00:01:00.000Z',
        },
      ],
      artifacts: [],
      archiveReceipts: [],
      greenGoods: {
        enabled: true,
        gardenAddress: '0x3333333333333333333333333333333333333333',
        memberBindings: [
          {
            memberId: 'member-1',
            actorAddress: '0x2222222222222222222222222222222222222222',
            desiredRoles: ['gardener'],
            currentRoles: [],
            status: 'pending-sync',
          },
        ],
        lastImpactReportAt: '2026-03-20T00:05:00.000Z',
      },
    } as never,
    activeMember: {
      id: 'member-1',
      displayName: 'Mina',
      address: '0x1111111111111111111111111111111111111111',
      role: 'member',
    } as never,
    runtimeConfig: null as never,
    stealthMetaAddress: null,
    coopForm: {
      createForm: initialCreateForm,
      setCreateForm: noop,
      inviteResult: null,
      joinInvite: '',
      setJoinInvite: noop,
      joinName: '',
      setJoinName: noop,
      joinSeed: '',
      setJoinSeed: noop,
      coopSpacePresets: listCoopSpacePresets(),
      selectedSpacePreset: getCoopSpacePreset('community'),
      createCoopAction: (event: FormEvent<HTMLFormElement>) => event.preventDefault(),
      joinCoopAction: (event: FormEvent<HTMLFormElement>) => event.preventDefault(),
    } as never,
    inviteResult: null,
    createInvite: noop,
    createReceiverPairing: noop,
    activeReceiverPairing: null,
    activeReceiverPairingStatus: null,
    activeReceiverProtocolLink: 'coop://receiver',
    visibleReceiverPairings: [],
    selectReceiverPairing: noop,
    copyText: noop,
    receiverIntake: [],
    draftEditor: {} as never,
    greenGoodsActionQueue: [
      {
        id: 'bundle-1',
        actionClass: 'green-goods-add-gardener',
        status: 'approved',
        coopId: 'coop-1',
        memberId: 'member-admin',
        policyId: 'policy-add',
        chainId: 11155111,
        chainKey: 'sepolia',
        safeAddress: '0x9999999999999999999999999999999999999999',
        payload: {
          coopId: 'coop-1',
          memberId: 'member-1',
          gardenerAddress: '0x2222222222222222222222222222222222222222',
        },
        rationale: 'Sync member into the garden.',
        approvals: [],
        rejections: [],
        executionAttempts: [],
        createdAt: '2026-03-20T00:06:00.000Z',
        updatedAt: '2026-03-20T00:06:00.000Z',
      } as ActionBundle,
    ],
    onProvisionMemberOnchainAccount: vi.fn(async () => undefined),
    onSubmitGreenGoodsWorkSubmission: vi.fn(async () => undefined),
    onSubmitGreenGoodsImpactReport: vi.fn(async () => undefined),
  };
}

describe('NestTab', () => {
  it('shows queued garden sync state and the member work submission form', () => {
    render(<NestTab {...createNestProps()} />);

    expect(screen.getByRole('heading', { name: 'Green Goods Access' })).toBeVisible();
    expect(screen.getByText(/garden sync queue/i)).toBeVisible();
    expect(screen.getByText(/1 queued/i)).toBeVisible();
    expect(
      screen.getAllByText('0x2222222222222222222222222222222222222222').length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /submit work submission/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /submit impact from my account/i })).toBeVisible();
  });
});
