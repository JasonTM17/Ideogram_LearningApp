import { describe, expect, it, vi } from 'vitest';

import {
  drainPlacementScoringJobs,
  runOnePlacementScoringJob,
  type PlacementScoringRpcClient,
} from './placement-scoring-worker';

const workerId = '123e4567-e89b-42d3-a456-426614174000';
const sessionId = '123e4567-e89b-42d3-a456-426614174001';

describe('placement scoring worker', () => {
  it('claims private input and completes a session without exposing its rubric', async () => {
    const rpc = vi.fn(async (functionName: string) => {
      if (functionName === 'claim_placement_scoring_job') {
        return { data: [{ placement_session_id: sessionId }], error: null };
      }
      if (functionName === 'get_placement_scoring_input') {
        return {
          data: [
            {
              answer_payload: { selectedChoice: 0 },
              question_type: 'vocabulary',
              scoring_rubric: { correctChoice: 0, skill: 'vocabulary' },
            },
          ],
          error: null,
        };
      }
      return { data: null, error: null };
    });

    await expect(
      runOnePlacementScoringJob({ rpc } as PlacementScoringRpcClient, workerId),
    ).resolves.toEqual({ kind: 'scored', placementSessionId: sessionId });
    expect(rpc).toHaveBeenLastCalledWith(
      'complete_placement_scoring_job',
      expect.objectContaining({
        p_placement_session_id: sessionId,
        p_recommended_level_code: 'N4',
        p_worker_id: workerId,
      }),
    );
  });

  it('stops a bounded drain when no job is available', async () => {
    const rpc = vi.fn(async () => ({ data: [], error: null }));

    await expect(
      drainPlacementScoringJobs({ rpc } as PlacementScoringRpcClient, workerId, 2),
    ).resolves.toBe(0);
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('quarantines a claimed job when published scoring input is unsupported', async () => {
    const rpc = vi.fn(async (functionName: string) => {
      if (functionName === 'claim_placement_scoring_job') {
        return { data: [{ placement_session_id: sessionId }], error: null };
      }
      if (functionName === 'get_placement_scoring_input') {
        return {
          data: [{ answer_payload: {}, question_type: 'vocabulary', scoring_rubric: {} }],
          error: null,
        };
      }
      return { data: null, error: null };
    });

    await expect(
      runOnePlacementScoringJob({ rpc } as PlacementScoringRpcClient, workerId),
    ).resolves.toEqual({ kind: 'failed', placementSessionId: sessionId });
    expect(rpc).toHaveBeenLastCalledWith('fail_placement_scoring_job', {
      p_failure_code: 'unsupported_scoring_input',
      p_placement_session_id: sessionId,
      p_worker_id: workerId,
    });
  });
});
