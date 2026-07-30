# Security Scan — Web/Auth/Learner Slice

**Date:** 2026-07-30  
**Scope:** `apps`, `packages`, `scripts`, `supabase`, `.github`

## Result

| Category | Critical | High | Medium | Low |
| -------- | -------- | ---- | ------ | --- |
| Secrets | 0 | 0 | 0 | 0 |
| Credential URLs | 0 | 0 | 0 | 0 |
| Dangerous code patterns | 0 | 0 | 0 | 0 |
| Production dependencies | 0 | 0 | 0 | 0 |

## Checks

- Structured cloud/provider tokens, generic DeepSeek-style keys, private keys,
  JWT literals, and credential-bearing database URLs: no source-file match
- Dynamic HTML/eval, disabled TLS verification, and security-sensitive
  `Math.random`: no production-source match
- Tracked non-example dotenv files: none
- `pnpm audit --prod`: no known vulnerability
- Public AI-key names and worker-secret placement: `pnpm check:env` passed

## Runtime review

The passwordless callback, same-origin mutation policy, active learner gate,
bounded OTP limiter, cookie budgets, and learner-catalog allowlist were reviewed
separately in
[reviewer-20260730-web-auth-learner.md](./reviewer-20260730-web-auth-learner.md).

## Release condition

The current OTP limiter is in-process defense-in-depth. Add a distributed
limiter and confirm trusted ingress header overwrite before horizontal or wider
production rollout.

Status: DONE
