export type NativeCubicBezier = readonly [number, number, number, number];

export const nativeMotionTokens = {
  duration: {
    instant: 0,
    fast: 150,
    medium: 220,
    slow: 300,
  },
  easing: {
    entrance: [0.16, 1, 0.3, 1] as const satisfies NativeCubicBezier,
    exit: [0.7, 0, 0.84, 0] as const satisfies NativeCubicBezier,
    standard: [0.2, 0, 0, 1] as const satisfies NativeCubicBezier,
  },
  reducedMotionDuration: 0,
} as const;

export type NativeMotionTokens = typeof nativeMotionTokens;
