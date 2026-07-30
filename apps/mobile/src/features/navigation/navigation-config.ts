export const tabDestinations = [
  {
    activeIcon: 'home',
    icon: 'home-outline',
    label: 'Hôm nay',
    route: 'index',
  },
  {
    activeIcon: 'book',
    icon: 'book-outline',
    label: 'Ôn tập',
    route: 'review',
  },
  {
    activeIcon: 'chatbubble-ellipses',
    icon: 'chatbubble-ellipses-outline',
    label: 'Trợ lý',
    route: 'assistant',
  },
  {
    activeIcon: 'analytics',
    icon: 'analytics-outline',
    label: 'Tiến độ',
    route: 'progress',
  },
  {
    activeIcon: 'person',
    icon: 'person-outline',
    label: 'Bạn',
    route: 'profile',
  },
] as const;

export const fullScreenRoutes = [
  { name: 'lessons/[lessonId]', fallbackPath: '/' },
  { name: 'review/session', fallbackPath: '/review' },
] as const;
