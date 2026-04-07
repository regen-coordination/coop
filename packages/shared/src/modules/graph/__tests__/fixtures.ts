import type { GraphEntity, GraphRelationship } from '../../../contracts/schema-knowledge';

let entityCounter = 0;
let relCounter = 0;

export function makeEntity(overrides: Partial<GraphEntity> = {}): GraphEntity {
  entityCounter++;
  return {
    id: overrides.id ?? `ent-${entityCounter}`,
    name: overrides.name ?? `Entity ${entityCounter}`,
    type: overrides.type ?? 'object',
    description: overrides.description ?? `Description ${entityCounter}`,
    sourceRef: overrides.sourceRef ?? `test:source-${entityCounter}`,
    ...overrides,
  };
}

export function makeRelationship(
  overrides: Partial<GraphRelationship> & { from: string; to: string },
): GraphRelationship {
  relCounter++;
  return {
    type: overrides.type ?? 'related-to',
    confidence: overrides.confidence ?? 0.8,
    t_valid: overrides.t_valid ?? '2026-01-01T00:00:00.000Z',
    t_invalid: overrides.t_invalid ?? null,
    provenance: overrides.provenance ?? 'test',
    ...overrides,
  };
}

/** Create a small connected graph: 10 entities + 20 edges */
export function seedTestGraph(): {
  entities: GraphEntity[];
  relationships: GraphRelationship[];
} {
  const entities: GraphEntity[] = [
    makeEntity({
      id: 'vitalik',
      name: 'Vitalik Buterin',
      type: 'person',
      description: 'Co-founder of Ethereum blockchain platform',
    }),
    makeEntity({
      id: 'ethereum',
      name: 'Ethereum',
      type: 'organization',
      description: 'Decentralized blockchain platform for smart contracts and dApps',
    }),
    makeEntity({
      id: 'eth-foundation',
      name: 'Ethereum Foundation',
      type: 'organization',
      description: 'Non-profit supporting Ethereum ecosystem development in Switzerland',
    }),
    makeEntity({
      id: 'solidity',
      name: 'Solidity',
      type: 'object',
      description: 'Programming language for writing smart contracts on Ethereum',
    }),
    makeEntity({
      id: 'devcon',
      name: 'Devcon',
      type: 'event',
      description: 'Annual developer conference for the Ethereum ecosystem',
    }),
    makeEntity({
      id: 'zug',
      name: 'Zug',
      type: 'location',
      description: 'City in Switzerland known as Crypto Valley, home to blockchain organizations',
    }),
    makeEntity({
      id: 'safe',
      name: 'Safe',
      type: 'organization',
      description: 'Smart contract wallet with multisig security for digital asset management',
    }),
    makeEntity({
      id: 'erc4337',
      name: 'ERC-4337',
      type: 'object',
      description: 'Account abstraction standard enabling smart contract wallets on Ethereum',
    }),
    makeEntity({
      id: 'arbitrum',
      name: 'Arbitrum',
      type: 'organization',
      description: 'Layer 2 optimistic rollup scaling solution for Ethereum',
    }),
    makeEntity({
      id: 'offchain-labs',
      name: 'Offchain Labs',
      type: 'organization',
      description: 'Team that created Arbitrum rollup technology for blockchain scaling',
    }),
  ];

  const relationships: GraphRelationship[] = [
    makeRelationship({
      from: 'vitalik',
      to: 'ethereum',
      type: 'co-founded',
      t_valid: '2015-07-30T00:00:00.000Z',
    }),
    makeRelationship({
      from: 'vitalik',
      to: 'eth-foundation',
      type: 'member-of',
      t_valid: '2014-06-01T00:00:00.000Z',
    }),
    makeRelationship({
      from: 'ethereum',
      to: 'solidity',
      type: 'uses',
      t_valid: '2015-07-30T00:00:00.000Z',
    }),
    makeRelationship({
      from: 'ethereum',
      to: 'erc4337',
      type: 'standard-of',
      t_valid: '2023-03-01T00:00:00.000Z',
    }),
    makeRelationship({
      from: 'safe',
      to: 'erc4337',
      type: 'implements',
      t_valid: '2023-06-01T00:00:00.000Z',
    }),
    makeRelationship({
      from: 'safe',
      to: 'ethereum',
      type: 'deployed-on',
      t_valid: '2018-01-01T00:00:00.000Z',
    }),
    makeRelationship({
      from: 'safe',
      to: 'arbitrum',
      type: 'deployed-on',
      t_valid: '2022-01-01T00:00:00.000Z',
    }),
    makeRelationship({
      from: 'arbitrum',
      to: 'ethereum',
      type: 'layer-2-of',
      t_valid: '2021-08-31T00:00:00.000Z',
    }),
    makeRelationship({
      from: 'offchain-labs',
      to: 'arbitrum',
      type: 'created',
      t_valid: '2021-08-31T00:00:00.000Z',
    }),
    makeRelationship({
      from: 'devcon',
      to: 'zug',
      type: 'held-in',
      t_valid: '2024-11-12T00:00:00.000Z',
    }),
    makeRelationship({
      from: 'devcon',
      to: 'ethereum',
      type: 'conference-for',
      t_valid: '2015-11-09T00:00:00.000Z',
    }),
    makeRelationship({
      from: 'eth-foundation',
      to: 'zug',
      type: 'headquartered-in',
      t_valid: '2014-06-01T00:00:00.000Z',
    }),
    makeRelationship({
      from: 'eth-foundation',
      to: 'ethereum',
      type: 'stewards',
      t_valid: '2014-06-01T00:00:00.000Z',
    }),
    makeRelationship({
      from: 'solidity',
      to: 'ethereum',
      type: 'language-for',
      t_valid: '2015-07-30T00:00:00.000Z',
    }),
    makeRelationship({
      from: 'erc4337',
      to: 'ethereum',
      type: 'proposal-for',
      t_valid: '2021-09-29T00:00:00.000Z',
    }),
    // Some invalidated edges for temporal testing
    makeRelationship({
      from: 'vitalik',
      to: 'eth-foundation',
      type: 'leads',
      t_valid: '2014-06-01T00:00:00.000Z',
      t_invalid: '2018-01-01T00:00:00.000Z',
    }),
    makeRelationship({
      from: 'safe',
      to: 'ethereum',
      type: 'gnosis-safe',
      t_valid: '2018-01-01T00:00:00.000Z',
      t_invalid: '2022-06-01T00:00:00.000Z',
    }),
    // Replacement edges (newer facts)
    makeRelationship({
      from: 'vitalik',
      to: 'eth-foundation',
      type: 'advisor-to',
      t_valid: '2018-01-01T00:00:00.000Z',
    }),
    makeRelationship({
      from: 'safe',
      to: 'ethereum',
      type: 'safe-wallet',
      t_valid: '2022-06-01T00:00:00.000Z',
    }),
    makeRelationship({
      from: 'offchain-labs',
      to: 'zug',
      type: 'office-in',
      t_valid: '2022-01-01T00:00:00.000Z',
    }),
  ];

  return { entities, relationships };
}
