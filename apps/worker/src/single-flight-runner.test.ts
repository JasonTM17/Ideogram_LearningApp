import { describe, expect, it, vi } from 'vitest';

import { createSingleFlightRunner } from './single-flight-runner';

describe('createSingleFlightRunner', () => {
  it('skips a poll while the previous drain is still running', async () => {
    let release!: () => void;
    const run = vi
      .fn<() => Promise<number>>()
      .mockImplementationOnce(
        () =>
          new Promise<number>((resolve) => {
            release = () => resolve(1);
          }),
      )
      .mockResolvedValueOnce(1);
    const runIfIdle = createSingleFlightRunner(run);

    const first = runIfIdle();
    await expect(runIfIdle()).resolves.toBeNull();
    release();
    await expect(first).resolves.toBe(1);
    await expect(runIfIdle()).resolves.toBe(1);
    expect(run).toHaveBeenCalledTimes(2);
  });
});
