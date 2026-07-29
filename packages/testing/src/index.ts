export const createFixedDate = (isoDate: string): Date => {
  const parsed = new Date(isoDate);

  if (Number.isNaN(parsed.getTime())) {
    throw new TypeError('Expected a valid ISO-compatible date string.');
  }

  return parsed;
};
