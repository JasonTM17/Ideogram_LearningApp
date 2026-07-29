-- The definer-owned catalog RPC reads the request subject through auth.uid().
-- This grants schema lookup only; the role remains no-login and has no direct
-- access to Auth tables or learner-visible private helpers.

grant usage on schema auth to app_security_definer;
