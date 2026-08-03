import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

import { Client } from 'pg';

import {
  createPlacementScoringWorkerFromEnvironment,
  runOnePlacementScoringJob,
} from '../src/placement-scoring-worker';

const requireEnvironment = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for placement worker integration.`);
  return value;
};

const requireLoopbackUrl = (name: string, value: string): void => {
  const hostname = new URL(value).hostname;
  if (!['127.0.0.1', '::1', 'localhost'].includes(hostname)) {
    throw new Error(`${name} must target a loopback host for placement worker integration.`);
  }
};

const databaseUrl = requireEnvironment('SUPABASE_DB_URL');
const supabaseUrl = requireEnvironment('SUPABASE_URL');
requireEnvironment('SUPABASE_SERVICE_ROLE_KEY');
requireLoopbackUrl('SUPABASE_DB_URL', databaseUrl);
requireLoopbackUrl('SUPABASE_URL', supabaseUrl);

const userId = randomUUID();
const workerId = randomUUID();
const startIdempotencyKey = randomUUID();
const answerIdempotencyKey = randomUUID();
const deviceId = randomUUID();
const email = `placement-worker-${userId}@example.test`;
const approvalToken = `placement-worker-approval-${userId}`;
let placementSessionId: string | null = null;

const database = new Client({ connectionString: databaseUrl });
await database.connect();

try {
  const existingQueue = await database.query<{ queued_job_count: number }>(
    `select count(*)::int as queued_job_count
     from private.placement_scoring_jobs
     where status = 'pending'
        or (status = 'processing' and lease_expires_at <= clock_timestamp())`,
  );
  assert.equal(
    existingQueue.rows[0]?.queued_job_count,
    0,
    'Local placement queue must be empty so the worker can only claim this fixture.',
  );

  await database.query('begin');
  await database.query(
    `insert into private.registration_approvals (
       email_digest, approval_token_digest, adult_policy_version,
       policy_document_digest, adult_attested_at, expires_at
     ) values (
       private.hash_email($1), private.hash_secret($2), 'adult-beta-v1',
       repeat('a', 64), clock_timestamp(), clock_timestamp() + interval '15 minutes'
     )`,
    [email, approvalToken],
  );
  await database.query(
    `insert into auth.users (
       id, aud, role, email, email_confirmed_at, raw_app_meta_data,
       raw_user_meta_data, created_at, updated_at
     ) values (
       $1, 'authenticated', 'authenticated', $2, clock_timestamp(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       jsonb_build_object('registration_approval_token', $3::text),
       clock_timestamp(), clock_timestamp()
     )`,
    [userId, email, approvalToken],
  );

  const placement = await database.query<{
    placement_question_id: string;
    placement_question_set_id: string;
  }>(
    `select sets.placement_question_set_id, questions.placement_question_id
     from public.placement_question_sets sets
     join public.placement_questions questions using (placement_question_set_id)
     where sets.language_code = 'ja'
       and sets.objective_key = 'exam'
       and sets.status = 'published'
       and questions.status = 'published'
     order by questions.sequence
     limit 1`,
  );
  assert.equal(placement.rowCount, 1, 'A published Japanese placement question is required.');
  const placementQuestion = placement.rows[0];
  assert.ok(placementQuestion);

  await database.query('set local role app_learning_api_executor');
  const started = await database.query<{ placement_session_id: string }>(
    `select placement_session_id
     from private.start_placement_session($1, $2, $3)`,
    [userId, placementQuestion.placement_question_set_id, startIdempotencyKey],
  );
  placementSessionId = started.rows[0]?.placement_session_id ?? null;
  assert.ok(placementSessionId, 'Placement session was not created.');

  await database.query(
    `select * from private.record_placement_answer(
       $1, $2, $3, 1, $4, $5, 1, repeat('a', 64),
       '{"selectedChoice":0}'::jsonb, 500, clock_timestamp()
     )`,
    [
      userId,
      placementSessionId,
      placementQuestion.placement_question_id,
      answerIdempotencyKey,
      deviceId,
    ],
  );
  await database.query('select * from private.submit_placement_session($1, $2)', [
    userId,
    placementSessionId,
  ]);
  await database.query('commit');

  const worker = createPlacementScoringWorkerFromEnvironment({
    ...process.env,
    PLACEMENT_SCORING_WORKER_ID: workerId,
  });
  const result = await runOnePlacementScoringJob(worker.client, worker.workerId);
  assert.deepEqual(result, { kind: 'scored', placementSessionId });

  const scored = await database.query<{
    confidence: string;
    recommended_level_code: string;
    session_status: string;
    snapshot_count: string;
  }>(
    `select sessions.session_status, sessions.recommended_level_code,
            sessions.confidence::text,
            count(snapshots.snapshot_id)::text as snapshot_count
     from public.placement_sessions sessions
     left join public.learner_proficiency_snapshots snapshots
       on snapshots.placement_session_id = sessions.placement_session_id
     where sessions.placement_session_id = $1
     group by sessions.placement_session_id`,
    [placementSessionId],
  );
  assert.deepEqual(scored.rows[0], {
    confidence: '0.950',
    recommended_level_code: 'N4',
    session_status: 'scored',
    snapshot_count: '1',
  });

  console.log('Placement worker integration passed: submitted -> claimed -> scored.');
} finally {
  await database.query('rollback').catch(() => undefined);
  await database.query('begin');
  await database.query('set local session_replication_role = replica');
  if (placementSessionId) {
    await database.query(
      'delete from private.placement_scoring_jobs where placement_session_id = $1',
      [placementSessionId],
    );
    await database.query(
      'delete from public.learner_proficiency_snapshots where placement_session_id = $1',
      [placementSessionId],
    );
    await database.query('delete from public.placement_answers where placement_session_id = $1', [
      placementSessionId,
    ]);
    await database.query('delete from public.placement_sessions where placement_session_id = $1', [
      placementSessionId,
    ]);
  }
  await database.query('delete from public.consent_records where user_id = $1', [userId]);
  await database.query('delete from public.account_roles where user_id = $1', [userId]);
  await database.query('delete from public.profiles where user_id = $1', [userId]);
  await database.query('delete from auth.users where id = $1', [userId]);
  await database.query(
    'delete from private.registration_approvals where email_digest = private.hash_email($1)',
    [email],
  );
  await database.query('commit');

  const remainingFixture = await database.query<{
    approval_count: number;
    profile_count: number;
    role_count: number;
    user_count: number;
  }>(
    `select
       (select count(*)::int from auth.users where id = $1) as user_count,
       (select count(*)::int from public.profiles where user_id = $1) as profile_count,
       (select count(*)::int from public.account_roles where user_id = $1) as role_count,
       (select count(*)::int from private.registration_approvals
          where email_digest = private.hash_email($2)) as approval_count`,
    [userId, email],
  );
  assert.deepEqual(remainingFixture.rows[0], {
    approval_count: 0,
    profile_count: 0,
    role_count: 0,
    user_count: 0,
  });
  await database.end();
}
