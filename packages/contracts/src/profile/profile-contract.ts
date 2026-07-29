export const accountStates = ['active', 'frozen', 'pending_deletion'] as const;
export const accountRoles = ['learner', 'content_editor', 'support', 'admin'] as const;
export const dataSubjectRequestKinds = ['export', 'deletion'] as const;
export const dataSubjectRequestStatuses = [
  'requested',
  'frozen',
  'processing',
  'completed',
  'failed',
  'cancelled',
] as const;

export type AccountRole = (typeof accountRoles)[number];
export type AccountState = (typeof accountStates)[number];
export type DataSubjectRequestKind = (typeof dataSubjectRequestKinds)[number];
export type DataSubjectRequestStatus = (typeof dataSubjectRequestStatuses)[number];

export interface LearnerProfileBoundary {
  accountState: AccountState;
  adultPolicyVersion: string;
  displayName: string | null;
  preferredUiLocale: 'vi-VN';
  roleEpoch: number;
  timezone: string;
  userId: string;
}

export interface DataSubjectRequestBoundary {
  requestId: string;
  requestKind: DataSubjectRequestKind;
  status: DataSubjectRequestStatus;
  transitionVersion: number;
}

export interface ProfilePreferencesInput {
  displayName?: string | null;
  preferredUiLocale: 'vi-VN';
  timezone: string;
}

const hasControlCharacter = (value: string): boolean =>
  [...value].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 31 || codePoint === 127;
  });

const isIanaTimezone = (timezone: string): boolean => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
};

export const parseProfilePreferencesInput = (value: unknown): ProfilePreferencesInput => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Profile preferences must be an object.');
  }

  const input = value as Record<string, unknown>;
  const displayName = input.displayName;
  const timezone = input.timezone;

  if (displayName !== undefined && displayName !== null && typeof displayName !== 'string') {
    throw new TypeError('displayName must be a string, null, or undefined.');
  }

  const normalizedDisplayName =
    typeof displayName === 'string' && displayName.trim().length > 0
      ? displayName.trim()
      : displayName === null
        ? null
        : undefined;

  if (normalizedDisplayName && normalizedDisplayName.length > 80) {
    throw new RangeError('displayName must contain at most 80 characters.');
  }

  if (input.preferredUiLocale !== 'vi-VN') {
    throw new TypeError('preferredUiLocale must be vi-VN during the Vietnamese-first beta.');
  }

  if (
    typeof timezone !== 'string' ||
    timezone.length === 0 ||
    timezone.length > 64 ||
    timezone.trim() !== timezone ||
    hasControlCharacter(timezone) ||
    !isIanaTimezone(timezone)
  ) {
    throw new TypeError('timezone must be a safe IANA timezone identifier.');
  }

  return {
    ...(normalizedDisplayName === undefined ? {} : { displayName: normalizedDisplayName }),
    preferredUiLocale: 'vi-VN',
    timezone,
  };
};
