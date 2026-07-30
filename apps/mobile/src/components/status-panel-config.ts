export const statusPanelVariants = ['loading', 'empty', 'error', 'offline', 'planned'] as const;

export type StatusPanelVariant = (typeof statusPanelVariants)[number];

export const statusPanelDefaults: Record<
  StatusPanelVariant,
  { accessibilityLabel: string; icon: string }
> = {
  empty: { accessibilityLabel: 'Trạng thái trống', icon: 'folder-open-outline' },
  error: { accessibilityLabel: 'Đã xảy ra lỗi', icon: 'alert-circle-outline' },
  loading: { accessibilityLabel: 'Đang tải nội dung', icon: 'hourglass-outline' },
  offline: { accessibilityLabel: 'Thiết bị đang ngoại tuyến', icon: 'cloud-offline-outline' },
  planned: { accessibilityLabel: 'Tính năng đang được chuẩn bị', icon: 'build-outline' },
};
