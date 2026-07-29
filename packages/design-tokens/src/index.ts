export const editorialTokens = {
  color: {
    accent: '#C86B39',
    ink: '#17202A',
    muted: '#667085',
    paper: '#FBF8F1',
    sage: '#D8E4D4',
  },
  radius: {
    card: 18,
    control: 12,
  },
  space: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    6: 24,
    8: 32,
  },
} as const;

export type EditorialTokens = typeof editorialTokens;
