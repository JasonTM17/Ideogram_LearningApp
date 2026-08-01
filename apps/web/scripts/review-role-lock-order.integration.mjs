import { randomUUID } from 'node:crypto';
import process from 'node:process';

import { Pool } from 'pg';

import {
  assertLocalSupabaseAdminDatabase,
  createLearnerFixture,
  removeLearnerFixture,
  rollbackClient,
  waitUntilLockBlocked,
} from './review-role-lock-order-test-support.mjs';

const connectionString = process.env.SUPABASE_DB_URL?.trim();

if (!connectionString) {
  throw new Error('SUPABASE_DB_URL is required for the local lock-order integration test.');
}

assertLocalSupabaseAdminDatabase(connectionString);

const pool = new Pool({
  application_name: 'ideogram-review-lock-order-test',
  connectionString,
  connectionTimeoutMillis: 5_000,
  max: 4,
});

const userId = randomUUID();
const email = `review-lock-${userId}@example.test`;
const approvalToken = `review-lock-approval-${randomUUID()}`;

const clients = [];
const connectClient = async () => {
  const client = await pool.connect();
  clients.push(client);
  return client;
};

let setupClient;
let revocationClient;
let mutationClient;
let observerClient;
let fixtureCreated = false;
let testError;
const destroyClients = new Set();

try {
  setupClient = await connectClient();
  revocationClient = await connectClient();
  mutationClient = await connectClient();
  observerClient = await connectClient();

  await createLearnerFixture(setupClient, { approvalToken, email, userId });
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
  await mutationClient.query("SET LOCAL lock_timeout = '10s'");
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
} catch (error) {
  testError = error;
}

let cleanupError;
try {
  for (const client of [revocationClient, mutationClient]) {
    if (client && (await rollbackClient(client))) {
      destroyClients.add(client);
    }
  }

  if (fixtureCreated && setupClient) {
    await removeLearnerFixture(setupClient, userId);
  } else if (setupClient && (await rollbackClient(setupClient))) {
    destroyClients.add(setupClient);
  }
} catch (error) {
  cleanupError = error;
  if (setupClient && (await rollbackClient(setupClient))) {
    destroyClients.add(setupClient);
  }
} finally {
  const resourceErrors = [];

  for (const client of clients) {
    try {
      client.release(destroyClients.has(client));
    } catch (error) {
      resourceErrors.push(error);
    }
  }

  try {
    await pool.end();
  } catch (error) {
    resourceErrors.push(error);
  }

  if (resourceErrors.length > 0) {
    const resourceError = new AggregateError(
      resourceErrors,
      'Lock-order test could not release all database resources.',
    );
    cleanupError = cleanupError
      ? new AggregateError([cleanupError, resourceError], 'Lock-order test cleanup failed.')
      : resourceError;
  }
}

if (testError && cleanupError) {
  throw new AggregateError(
    [testError, cleanupError],
    'Lock-order test and fixture cleanup failed.',
  );
}
if (testError) {
  throw testError;
}
if (cleanupError) {
  throw cleanupError;
}
