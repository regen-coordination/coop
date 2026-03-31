import type { InviteType } from '@coop/shared';

export interface InviteShareInput {
  coopName: string;
  inviteType: InviteType;
  code: string;
  expiresAt: string;
}

export interface InviteShareContent {
  previewTitle: string;
  previewBody: string;
  shareText: string;
  trustedWarning: string | null;
  confirmBeforeNativeShare: boolean;
}

function formatExpiryDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function memberMessage(coopName: string, code: string, expiresAt: string): string {
  return [
    `Join ${coopName} as a member.`,
    '',
    'Use this code in Coop > Join with Code:',
    code,
    '',
    'Member access lets you capture, review, and participate in the coop.',
    'This code can be used by multiple people until it is revoked or expires.',
    `Expires ${formatExpiryDate(expiresAt)}.`,
  ].join('\n');
}

function trustedMessage(coopName: string, code: string, expiresAt: string): string {
  return [
    `Join ${coopName} as a trusted member.`,
    '',
    'Use this code in Coop > Join with Code:',
    code,
    '',
    'Trusted members can help steward the coop and manage invite codes.',
    'This code can be used by multiple people until it is revoked or expires.',
    `Expires ${formatExpiryDate(expiresAt)}.`,
  ].join('\n');
}

const TRUSTED_WARNING = 'Trusted invites grant stewardship access. Share intentionally.';

export function buildInviteShareContent(input: InviteShareInput): InviteShareContent {
  const { coopName, inviteType, code, expiresAt } = input;
  const isTrusted = inviteType === 'trusted';
  const message = isTrusted
    ? trustedMessage(coopName, code, expiresAt)
    : memberMessage(coopName, code, expiresAt);

  return {
    previewTitle: isTrusted ? `Trusted invite to ${coopName}` : `Member invite to ${coopName}`,
    previewBody: message,
    shareText: message,
    trustedWarning: isTrusted ? TRUSTED_WARNING : null,
    confirmBeforeNativeShare: isTrusted,
  };
}
