import { describe, expect, it } from 'vitest';
import type { CaptureExclusionCategory } from '../../../contracts/schema';
import { CAPTURE_EXCLUSION_DEFAULTS, isDomainExcluded } from '../capture-exclusions';

type ExclusionPrefs = {
  excludedCategories: CaptureExclusionCategory[];
  customExcludedDomains: string[];
};

describe('CAPTURE_EXCLUSION_DEFAULTS', () => {
  it('contains entries for all four categories', () => {
    expect(Object.keys(CAPTURE_EXCLUSION_DEFAULTS)).toEqual([
      'email',
      'banking',
      'health',
      'social-dm',
    ]);
    for (const domains of Object.values(CAPTURE_EXCLUSION_DEFAULTS)) {
      expect(domains.length).toBeGreaterThan(0);
    }
  });
});

describe('isDomainExcluded', () => {
  const defaultPrefs: ExclusionPrefs = {
    excludedCategories: ['email', 'banking', 'health'],
    customExcludedDomains: [],
  };

  it('returns true for an exact match in an enabled category', () => {
    expect(isDomainExcluded('mail.google.com', defaultPrefs)).toBe(true);
    expect(isDomainExcluded('chase.com', defaultPrefs)).toBe(true);
    expect(isDomainExcluded('mychart.com', defaultPrefs)).toBe(true);
  });

  it('returns false for domains not in any enabled category', () => {
    expect(isDomainExcluded('github.com', defaultPrefs)).toBe(false);
    expect(isDomainExcluded('wikipedia.org', defaultPrefs)).toBe(false);
  });

  it('returns false for domains in a disabled category', () => {
    expect(isDomainExcluded('discord.com', defaultPrefs)).toBe(false);
    expect(isDomainExcluded('web.whatsapp.com', defaultPrefs)).toBe(false);
  });

  it('matches subdomains via suffix match', () => {
    expect(isDomainExcluded('banking.chase.com', defaultPrefs)).toBe(true);
    expect(isDomainExcluded('secure.bankofamerica.com', defaultPrefs)).toBe(true);
  });

  it('does not false-positive on partial domain matches', () => {
    expect(isDomainExcluded('notchase.com', defaultPrefs)).toBe(false);
  });

  it('respects custom excluded domains', () => {
    const prefs: ExclusionPrefs = {
      excludedCategories: [],
      customExcludedDomains: ['mybank.example.com', 'private.site.org'],
    };
    expect(isDomainExcluded('mybank.example.com', prefs)).toBe(true);
    expect(isDomainExcluded('private.site.org', prefs)).toBe(true);
    expect(isDomainExcluded('sub.mybank.example.com', prefs)).toBe(true);
    expect(isDomainExcluded('other.com', prefs)).toBe(false);
  });

  it('handles empty categories and empty custom domains', () => {
    const prefs: ExclusionPrefs = {
      excludedCategories: [],
      customExcludedDomains: [],
    };
    expect(isDomainExcluded('mail.google.com', prefs)).toBe(false);
    expect(isDomainExcluded('chase.com', prefs)).toBe(false);
  });

  it('includes social-dm domains when category is enabled', () => {
    const prefs: ExclusionPrefs = {
      excludedCategories: ['social-dm'],
      customExcludedDomains: [],
    };
    expect(isDomainExcluded('discord.com', prefs)).toBe(true);
    expect(isDomainExcluded('web.whatsapp.com', prefs)).toBe(true);
    expect(isDomainExcluded('mail.google.com', prefs)).toBe(false);
  });

  it('combines category domains with custom domains', () => {
    const prefs: ExclusionPrefs = {
      excludedCategories: ['email'],
      customExcludedDomains: ['secret-forum.io'],
    };
    expect(isDomainExcluded('mail.google.com', prefs)).toBe(true);
    expect(isDomainExcluded('secret-forum.io', prefs)).toBe(true);
    expect(isDomainExcluded('github.com', prefs)).toBe(false);
  });
});
