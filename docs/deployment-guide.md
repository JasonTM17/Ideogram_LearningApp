# Deployment Guide

## Status

No production deployment or cloud provisioning has been completed from this repository yet. This guide documents the intended local and future deployment shape only.

## Local workflow

```bash
corepack enable
corepack pnpm install --frozen-lockfile
pnpm check:env
pnpm supabase:start
pnpm dev
```

## Validation workflow

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Supabase local commands

```bash
pnpm supabase:start
pnpm supabase:status
pnpm supabase:stop
```

Local analytics is explicitly disabled in `supabase/config.toml`. The foundation
does not need Logs Explorer, and keeping Logflare/Vector off avoids granting a
log collector access to the host Docker socket. Auth, Postgres, Realtime,
Storage, Studio, and the versioned app API remain available.

The local Supabase baseline is deliberately conservative: self-service signup is
off until the adult eligibility path is implemented, and the internal
`storage` schema is not exposed through PostgREST. Use the Storage API and
policy-tested application routes instead of direct storage metadata writes.

## Intended deployment shape

| Surface    | Intended target       | Notes                                          |
| ---------- | --------------------- | ---------------------------------------------- |
| Web        | Next.js host          | Canonical `/api/v1` route host                 |
| Mobile     | Expo release pipeline | Uses `runtimeVersion` with `appVersion` policy |
| Worker     | Node runtime          | Handles deferred or heavy jobs                 |
| Data plane | Supabase              | Auth, Postgres, storage, RLS                   |

## Secrets handling

- Keep `DEEPSEEK_API_KEY` server-only.
- Use protected deployment secrets for shared environments.
- Do not publish real secrets in docs, screenshots, or repo files.

## Open items

- Production environment provisioning
- Store release ownership
- Monitoring and alerting thresholds for live traffic
