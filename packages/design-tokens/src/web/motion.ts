export const webMotionTokens = {
  duration: {
    instant: 0,
    fast: 150,
    medium: 220,
    slow: 300,
  },
  easing: {
    entrance: 'cubic-bezier(0.16, 1, 0.3, 1)',
    exit: 'cubic-bezier(0.7, 0, 0.84, 0)',
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
  },
  reducedMotionDuration: 0.01,
} as const;

export type WebMotionTokens = typeof webMotionTokens;
