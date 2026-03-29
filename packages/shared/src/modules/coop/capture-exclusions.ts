import type { CaptureExclusionCategory, UiPreferences } from '../../contracts/schema';

export const CAPTURE_EXCLUSION_DEFAULTS: Record<CaptureExclusionCategory, string[]> = {
  email: [
    'mail.google.com',
    'outlook.live.com',
    'outlook.office365.com',
    'mail.yahoo.com',
    'protonmail.com',
    'mail.proton.me',
    'fastmail.com',
    'hey.com',
    'tutanota.com',
  ],
  banking: [
    'chase.com',
    'bankofamerica.com',
    'wellsfargo.com',
    'citi.com',
    'capitalone.com',
    'schwab.com',
    'fidelity.com',
    'vanguard.com',
    'ally.com',
    'venmo.com',
    'paypal.com',
  ],
  health: ['mychart.com', 'patient.myhealth.va.gov', 'kp.org', 'betterhelp.com', 'talkspace.com'],
  'social-dm': [
    'web.whatsapp.com',
    'messenger.com',
    'web.telegram.org',
    'discord.com',
    'messages.google.com',
    'signal.org',
  ],
};

export function isDomainExcluded(
  domain: string,
  prefs: Pick<UiPreferences, 'excludedCategories' | 'customExcludedDomains'>,
): boolean {
  const excluded = new Set<string>();

  for (const category of prefs.excludedCategories) {
    const domains = CAPTURE_EXCLUSION_DEFAULTS[category];
    if (domains) {
      for (const d of domains) {
        excluded.add(d);
      }
    }
  }

  for (const d of prefs.customExcludedDomains) {
    excluded.add(d);
  }

  if (excluded.has(domain)) {
    return true;
  }

  // Suffix match: banking.chase.com matches chase.com
  for (const pattern of excluded) {
    if (domain.endsWith(`.${pattern}`)) {
      return true;
    }
  }

  return false;
}
