export const profileContent = {
  controlGroups: [
    {
      description: 'Mục tiêu, ngôn ngữ và lịch học sẽ dùng dữ liệu tài khoản thật.',
      icon: 'flag-outline',
      label: 'Mục tiêu học tập',
    },
    {
      description: 'Lịch sử AI, dữ liệu tải về và quyền riêng tư sẽ có nơi xem và xoá rõ ràng.',
      icon: 'lock-closed-outline',
      label: 'Quyền riêng tư và dữ liệu',
    },
    {
      description: 'Kênh trợ giúp sẽ xuất hiện cùng thông tin hỗ trợ đã được xác minh.',
      icon: 'help-circle-outline',
      label: 'Trợ giúp',
    },
  ],
  description: 'Đây sẽ là nơi quản lý mục tiêu, ngôn ngữ, dữ liệu ngoại tuyến và quyền riêng tư.',
  eyebrow: 'Hồ sơ và kiểm soát',
  stateDescription:
    'Thông tin tài khoản và cài đặt chỉ xuất hiện sau khi phiên đăng nhập an toàn được triển khai.',
  stateTitle: 'Hồ sơ chưa được kết nối',
  title: 'Bạn',
} as const;
