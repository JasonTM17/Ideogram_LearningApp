export const assistantContent = {
  description:
    'Trợ lý sẽ chỉ phản hồi khi có ngữ cảnh học, nguồn phù hợp và cách phục hồi rõ ràng.',
  eyebrow: 'Hỗ trợ có căn cứ',
  plannedCapabilities: [
    {
      description: 'Giải thích dựa trên bài học đang mở, không phải trò chuyện chung chung.',
      icon: 'document-text-outline',
      label: 'Ngữ cảnh bài học',
    },
    {
      description: 'Nêu rõ đâu là rubric, đâu là gợi ý và khi nào thông tin chưa chắc chắn.',
      icon: 'shield-checkmark-outline',
      label: 'Ranh giới tin cậy',
    },
    {
      description: 'Giữ bản nháp khi mất mạng; không giả vờ đã gửi hoặc đã lưu.',
      icon: 'cloud-offline-outline',
      label: 'Phục hồi minh bạch',
    },
  ],
  stateDescription:
    'Ô nhập và lịch sử trò chuyện chỉ được bật sau khi phiên đăng nhập và dịch vụ AI an toàn hoàn tất.',
  stateTitle: 'Trợ lý chưa khả dụng',
  title: 'Trợ lý',
} as const;
