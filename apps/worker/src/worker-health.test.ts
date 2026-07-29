import { describe, expect, it } from 'vitest';

import { createWorkerHealthReport } from './worker-health';

describe('createWorkerHealthReport', () => {
  it('reports a deterministic ready state for orchestration checks', () => {
    expect(createWorkerHealthReport(new Date('2026-07-29T00:00:00.000Z'))).toEqual({
      service: 'ideogram-worker',
      status: 'ready',
      timestamp: '2026-07-29T00:00:00.000Z',
    });
  });
});
