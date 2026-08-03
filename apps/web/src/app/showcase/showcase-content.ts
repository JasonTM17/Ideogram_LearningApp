export const sourceRepositoryUrl = 'https://github.com/JasonTM17/Ideogram_LearningApp';

export const shippedCapabilities = [
  {
    detail: 'Next.js public site, sign-in email link, SSR learner shell và catalog read route.',
    title: 'Web có luồng thật',
  },
  {
    detail:
      'Expo với phiên native, Today/Lesson read views, vocabulary completion và SRS review receipt-safe.',
    title: 'Mobile song hành',
  },
  {
    detail:
      'API có xác thực, idempotency, RLS boundary và evaluator ở database cho vocabulary/objective listening.',
    title: 'Learning write boundary',
  },
  {
    detail:
      'Tutor turn JSON có quota, consent policy, retry receipt và server-only provider credential.',
    title: 'AI có ranh giới',
  },
  {
    detail:
      'Onboarding/placement answer-safe trên web và Expo; retryable native writes được giữ trong SecureStore theo phiên người học.',
    title: 'Placement và sync có thật',
  },
] as const;

export const plannedCapabilities = [
  'Worker placement scoring, media download và background/browser sync',
  'Grounded/SSE tutor, history dài hạn và admin workflow',
  'Speaking/writing assessment và runtime production hosting',
] as const;
