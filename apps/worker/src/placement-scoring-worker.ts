import { randomUUID } from 'node:crypto';

import { createClient } from '@supabase/supabase-js';

import { scoreJapanesePlacement, type PlacementScoringInput } from './placement-scorer';

interface RpcError {
  message: string;
}

interface RpcResponse<T> {
  data: T | null;
  error: RpcError | null;
}

export interface PlacementScoringRpcClient {
  rpc: <T>(functionName: string, parameters: Record<string, unknown>) => Promise<RpcResponse<T>>;
}

interface ClaimedPlacementJob {
  placement_session_id: string;
}

interface PlacementScoringInputRow {
  answer_payload: Record<string, unknown>;
  question_type: string;
  scoring_rubric: Record<string, unknown>;
}

export type PlacementScoringRunResult =
  { kind: 'idle' } | { kind: 'scored'; placementSessionId: string };

const requireRows = <T>(response: RpcResponse<T[]>, operation: string): T[] => {
  if (response.error) throw new Error(`${operation} failed.`);
  return response.data ?? [];
};

const toScoringInputs = (rows: PlacementScoringInputRow[]): PlacementScoringInput[] =>
  rows.map((row) => ({
    answerPayload: row.answer_payload,
    questionType: row.question_type,
    scoringRubric: row.scoring_rubric,
  }));

export const runOnePlacementScoringJob = async (
  client: PlacementScoringRpcClient,
  workerId: string,
): Promise<PlacementScoringRunResult> => {
  const claimedJobs = requireRows(
    await client.rpc<ClaimedPlacementJob[]>('claim_placement_scoring_job', {
      p_worker_id: workerId,
    }),
    'Placement job claim',
  );
  const claimedJob = claimedJobs[0];
  if (!claimedJob) return { kind: 'idle' };

  const inputRows = requireRows(
    await client.rpc<PlacementScoringInputRow[]>('get_placement_scoring_input', {
      p_placement_session_id: claimedJob.placement_session_id,
    }),
    'Placement scoring input read',
  );
  const score = scoreJapanesePlacement(toScoringInputs(inputRows));
  const completed = await client.rpc('complete_placement_scoring_job', {
    p_confidence: score.confidence,
    p_placement_session_id: claimedJob.placement_session_id,
    p_recommended_level_code: score.recommendedLevelCode,
    p_score_summary: score.scoreSummary,
    p_worker_id: workerId,
  });
  if (completed.error) throw new Error('Placement job completion failed.');

  return { kind: 'scored', placementSessionId: claimedJob.placement_session_id };
};

export const drainPlacementScoringJobs = async (
  client: PlacementScoringRpcClient,
  workerId: string,
  maxJobs = 10,
): Promise<number> => {
  let completed = 0;
  while (completed < maxJobs) {
    const result = await runOnePlacementScoringJob(client, workerId);
    if (result.kind === 'idle') return completed;
    completed += 1;
  }
  return completed;
};

export const createPlacementScoringWorkerFromEnvironment = (
  environment: NodeJS.ProcessEnv = process.env,
) => {
  const supabaseUrl = environment.SUPABASE_URL;
  const serviceRoleKey = environment.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Placement worker configuration is missing.');
  }
  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: 'private' },
  });
  const placementClient: PlacementScoringRpcClient = {
    rpc: async <T>(functionName: string, parameters: Record<string, unknown>) => {
      const response = await client.rpc(functionName, parameters);
      return {
        data: response.data as T | null,
        error: response.error ? { message: response.error.message } : null,
      };
    },
  };
  const workerId = environment.PLACEMENT_SCORING_WORKER_ID ?? randomUUID();
  return { client: placementClient, workerId };
};
