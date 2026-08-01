const localDatabaseHosts = new Set(['127.0.0.1', 'localhost']);

export const assertLocalSupabaseAdminDatabase = (connectionString) => {
  const databaseUrl = new URL(connectionString);

  if (
    !localDatabaseHosts.has(databaseUrl.hostname) ||
    databaseUrl.port !== '54322' ||
    databaseUrl.pathname !== '/postgres' ||
    databaseUrl.username !== 'postgres' ||
    databaseUrl.search
  ) {
    throw new Error(
      'The lock-order integration test requires the local Supabase admin database on port 54322 without URL overrides.',
    );
  }
};

export const waitUntilLockBlocked = async (observer, processId) => {
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

export const createLearnerFixture = async (client, fixture) => {
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
    [fixture.email, fixture.approvalToken],
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
    [fixture.userId, fixture.email, fixture.approvalToken],
  );
  await client.query('COMMIT');
};

export const removeLearnerFixture = async (client, userId) => {
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

export const rollbackClient = async (client) => {
  try {
    await client.query('ROLLBACK');
  } catch {
    return true;
  }

  return false;
};
