import { describe, expect, it } from 'vitest';
import { parseNPMPackageInfo } from '../npm';
import npmFixture from './fixtures/npm-package-meta.json';

describe('parseNPMPackageInfo', () => {
  it('returns metadata from fixture', () => {
    const result = parseNPMPackageInfo(npmFixture, 'viem');

    expect(result.title).toBe('viem');
    expect(result.body).toContain('TypeScript Interface for Ethereum');
    expect(result.sourceRef).toBe('npm:viem');
    expect(result.fetchedAt).toBeTruthy();
    expect(result.metadata).toHaveProperty('version', '2.30.0');
    expect(result.metadata).toHaveProperty('license', 'MIT');
  });

  it('handles scoped packages', () => {
    const scopedFixture = {
      ...npmFixture,
      name: '@anthropic-ai/sdk',
    };
    const result = parseNPMPackageInfo(scopedFixture, '@anthropic-ai/sdk');

    expect(result.title).toBe('@anthropic-ai/sdk');
    expect(result.sourceRef).toBe('npm:@anthropic-ai/sdk');
  });
});
