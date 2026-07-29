# DeepSeek Provider Decision

Date: 2026-07-29
Status: confirmed by product owner; security setup pending rotated credential.

## Decision

- Primary model: `deepseek-v4-flash`.
- API base URL: `https://api.deepseek.com`.
- Transport: OpenAI-compatible Chat Completions with streaming for live tutor.
- Tutor default: non-thinking mode for latency and cost.
- Complex grading candidate: thinking mode, `reasoning_effort=high`, still using
  `deepseek-v4-flash`; it remains disabled until task-specific eval passes.
- No automatic fallback provider. A fallback needs its own privacy, cost and
  golden-set approval.

Official DeepSeek documentation lists `deepseek-v4-flash` as a supported model,
keeps the OpenAI-format base URL unchanged and supports streaming plus dual
thinking modes:

- [Model list](https://api-docs.deepseek.com/api/list-models)
- [First API call](https://api-docs.deepseek.com/guides/function_calling/)
- [Chat completion API](https://api-docs.deepseek.com/api/create-chat-completion)
- [Models and pricing](https://api-docs.deepseek.com/quick_start/pricing/)

## Environment contract

Committed values in `.env.example` are non-secret:

```dotenv
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_TUTOR_THINKING_MODE=disabled
DEEPSEEK_GRADING_THINKING_MODE=enabled
DEEPSEEK_REASONING_EFFORT=high
```

`DEEPSEEK_API_KEY` is server/worker-only. It must never use `NEXT_PUBLIC_*` or
`EXPO_PUBLIC_*`, appear in client bundles, logs, screenshots, fixtures, commits,
CI artifacts or preview deployments from untrusted forks.

## Credential response

The credential shared in conversation is treated as exposed. Do not test,
persist or deploy it. Revoke it in DeepSeek Platform, create a replacement, then
store the replacement in:

- ignored `.env.local` for local development; or
- the protected secret store of the approved staging/production environment.

The application must fail closed or disable AI routes when the key is missing;
it must never fall back to a browser/mobile key.

## Remaining gates

- Product owner approves spending cap and alert thresholds.
- Privacy/legal owner approves DPA, region, provider retention and training-use
  terms for learner text/audio.
- AI eval proves Vietnamese tutoring quality and per-task cost/latency limits.
- Rotated-key owner and rotation/revocation runbook are recorded.
