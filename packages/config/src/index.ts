export const platformRuntimeNames = ['web', 'mobile', 'worker'] as const;

export type PlatformRuntimeName = (typeof platformRuntimeNames)[number];

export const isPlatformRuntimeName = (value: string): value is PlatformRuntimeName =>
  platformRuntimeNames.includes(value as PlatformRuntimeName);
