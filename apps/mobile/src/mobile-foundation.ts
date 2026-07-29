export const mobileFoundation = {
  description: 'Ứng dụng học Nhật, Trung và Hàn dành cho người Việt đang ở giai đoạn beta nội bộ.',
  name: 'Ideogram Learning',
  stage: 'Internal beta foundation',
} as const;

export const betaMinimumOsMajor = {
  android: 10,
  ios: 17,
} as const;

export type MobilePlatform = keyof typeof betaMinimumOsMajor;

export const isBetaOsSupported = (platform: MobilePlatform, majorVersion: number): boolean =>
  Number.isInteger(majorVersion) && majorVersion >= betaMinimumOsMajor[platform];
