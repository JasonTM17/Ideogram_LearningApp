import { randomUUID } from 'node:crypto';
import process from 'node:process';

import { Pool } from 'pg';

const connectionString = process.env.SUPABASE_DB_URL?.trim();

if (!connectionString) {
  throw new Error('SUPABASE_DB_URL is required for the local lock-order integration test.');
}

const databaseUrl = new URL(connectionString);
if (!['127.0.0.1', 'localhost'].includes(databaseUrl.hostname)) {
  throw new Error('The lock-order integration test may run only against a local database.');
}

const pool = new Pool({
  application_name: 'ideogram-review-lock-order-test',
  connectionString,
  connectionTimeoutMillis: 5_000,
  max: 4,
});

const userId = randomUUID();
const email = `review-lock-${userId}@example.test`;
const approvalToken = `review-lock-approval-${randomUUID()}`;

const waitUntilLockBlocked = async (observer, processId) => {
  const deadline = Date.now() + 3_000;

  while (Date.now() < deadline) {
    const result = await observer.query(
      `select wait_event_type
       from pg_catalog.pg_stat_activity
       where pid = $1`,
      [processId],
    );

    if (result.rows[0]?.wait_event_type === 'Lock') {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  throw new Error('Learning authorization did not block on the learner-role row as expected.');
};

const setupFixture = async (client) => {
  await client.query('BEGIN');
  await client.query(
    `insert into private.registration_approvals (
       email_digest,
       approval_token_digest,
       adult_policy_version,
       policy_document_digest,
       adult_attested_at,
       expires_at
     )
     values (
       private.hash_email($1),
       private.hash_secret($2),
       'adult-beta-v1',
       repeat('a', 64),
       clock_timestamp(),
       clock_timestamp() + interval '15 minutes'
     )`,
    [email, approvalToken],
  );
  await client.query(
    `insert into auth.users (
       id,
       aud,
       role,
       email,
       email_confirmed_at,
       raw_app_meta_data,
       raw_user_meta_data,
       created_at,
       updated_at
     )
     values (
       $1,
       'authenticated',
       'authenticated',
       $2,
       clock_timestamp(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       jsonb_build_object('registration_approval_token', $3::text),
       clock_timestamp(),
       clock_timestamp()
     )`,
    [userId, email, approvalToken],
  );
  await client.query('COMMIT');
};

const cleanupFixture = async (client) => {
  await client.query('BEGIN');
  await client.query("SET LOCAL session_replication_role = 'replica'");
  await client.query('delete from public.consent_records where user_id = $1', [userId]);
  await client.query('delete from public.account_roles where user_id = $1', [userId]);
  await client.query('delete from public.profiles where user_id = $1', [userId]);
  await client.query('delete from auth.users where id = $1', [userId]);
  await client.query('delete from private.registration_approvals where consumed_user_id = $1', [
    userId,
  ]);
  await client.query('COMMIT');
};

const rollbackQuietly = async (client) => {
  try {
    await client.query('ROLLBACK');
  } catch {
    client.release(true);
    return false;
  }

  return true;
};

const setupClient = await pool.connect();
const revocationClient = await pool.connect();
const mutationClient = await pool.connect();
const observerClient = await pool.connect();
let fixtureCreated = false;
let revocationClientReusable = true;
let mutationClientReusable = true;

try {
  await setupFixture(setupClient);
  fixtureCreated = true;

  const mutationProcessId = await mutationClient
    .query('select pg_catalog.pg_backend_pid() as process_id')
    .then((result) => result.rows[0].process_id);

  await revocationClient.query('BEGIN');
  await revocationClient.query("SET LOCAL lock_timeout = '3s'");
  await revocationClient.query(
    `select 1
     from public.account_roles
     where user_id = $1
       and role = 'learner'
     for update`,
    [userId],
  );

  await mutationClient.query('BEGIN');
  await mutationClient.query("SET LOCAL lock_timeout = '3s'");
  const authorizationOutcome = mutationClient
    .query('select private.require_active_learning_account($1)', [userId])
    .then(
      (value) => ({ status: 'fulfilled', value }),
      (error) => ({ error, status: 'rejected' }),
    );

  await waitUntilLockBlocked(observerClient, mutationProcessId);

  await revocationClient.query(
    `update public.account_roles
     set revoked_at = revoked_at
     where user_id = $1
       and role = 'learner'`,
    [userId],
  );
  await revocationClient.query('COMMIT');

  const outcome = await authorizationOutcome;
  if (outcome.status === 'rejected') {
    throw outcome.error;
  }
  await mutationClient.query('COMMIT');

  console.log('Review authorization and learner-role revocation use a consistent lock order.');
} finally {
  revocationClientReusable = await rollbackQuietly(revocationClient);
  mutationClientReusable = await rollbackQuietly(mutationClient);

  if (fixtureCreated) {
    await cleanupFixture(setupClient);
  }

  setupClient.release();
  if (revocationClientReusable) {
    revocationClient.release();
  }
  if (mutationClientReusable) {
    mutationClient.release();
  }
  observerClient.release();
  await pool.end();
}
