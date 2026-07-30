import type { LucideIcon } from 'lucide-react';
import { Bot, ChartColumn, House, RotateCcw, UserRound } from 'lucide-react';

export type LearnerDestinationKey = 'today' | 'review' | 'assistant' | 'progress' | 'profile';

export interface LearnerDestination {
  key: LearnerDestinationKey;
  label: string;
  href?: string;
  description: string;
  icon: LucideIcon;
  planned?: boolean;
}

export const learnerPrimaryDestinations: readonly LearnerDestination[] = [
  {
    key: 'today',
    label: 'Hôm nay',
    href: '/today',
    description: 'Bài học kế tiếp và gợi ý ưu tiên trong ngày.',
    icon: House,
  },
  {
    key: 'review',
    label: 'Ôn tập',
    href: '/review',
    description: 'Hàng đợi SRS và các mục đến hạn cần xử lý.',
    icon: RotateCcw,
    planned: true,
  },
  {
    key: 'assistant',
    label: 'Trợ lý',
    href: '/assistant',
    description: 'Gia sư AI trong ngữ cảnh học sẽ xuất hiện ở pha tích hợp tiếp theo.',
    icon: Bot,
    planned: true,
  },
  {
    key: 'progress',
    label: 'Tiến độ',
    href: '/progress',
    description: 'Insight theo kỹ năng, mục tiêu và lỗi lặp lại.',
    icon: ChartColumn,
    planned: true,
  },
  {
    key: 'profile',
    label: 'Bạn',
    href: '/you',
    description: 'Hồ sơ, mục tiêu, quyền riêng tư và trợ giúp.',
    icon: UserRound,
  },
] as const;
