export const assistantContent = {
  description: 'Hỏi bằng tiếng Việt; Trợ lý trả lời theo ngôn ngữ, trình độ và mục tiêu bạn chọn.',
  eyebrow: 'Hỗ trợ có căn cứ',
  plannedCapabilities: [
    {
      description: 'Giải thích theo cấu hình ngôn ngữ, trình độ và mục tiêu của bạn.',
      icon: 'document-text-outline',
      label: 'Cấu hình riêng',
    },
    {
      description: 'Hiển thị ranh giới nguồn để bạn biết đâu là câu trả lời chưa có bài học.',
      icon: 'shield-checkmark-outline',
      label: 'Ranh giới tin cậy',
    },
    {
      description: 'Không giả vờ đã lưu hoặc hoàn tất khi mạng hay dịch vụ gặp lỗi.',
      icon: 'cloud-offline-outline',
      label: 'Phục hồi minh bạch',
    },
  ],
  stateDescription: 'Bạn có thể bắt đầu bằng một câu hỏi ngôn ngữ ngắn bằng tiếng Việt.',
  stateTitle: 'Trợ lý đã có kết nối',
  title: 'Trợ lý',
} as const;
