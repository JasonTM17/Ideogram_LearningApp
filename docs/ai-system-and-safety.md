# AI System and Safety

## Current boundary

The AI package remains server-only and is imported only by the Node web route. The
first bounded public surface now exists at `POST /api/v1/ai/tutor/turn`, but it is
fail-closed until `AI_TUTOR_ENABLED=true`, provider configuration, budget approval,
and the learner's append-only provider-consent record are present. It persists
private conversation/turn/rate-window rows and never exposes those tables to web or
mobile clients. Grounded published-content retrieval, direct SSE, mobile transport,
history UI, and evaluation gates remain separate release work.

## Provider contract

- `packages/ai/src/deepseek-tutor-configuration.ts` accepts only the approved
  HTTPS DeepSeek origin and `deepseek-v4-flash` model.
- `DEEPSEEK_API_KEY` is read only at the server boundary. Never use an
  `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*` variable for it.
- The gateway requests structured JSON, applies a 15-second maximum provider
  deadline, propagates caller cancellation, validates output with Zod, and
  exposes no tool execution surface. Provider response bodies are bounded and
  token usage is required for metering.
- `AI_TUTOR_INPUT_PRICE_MICRO_USD_PER_MILLION_TOKENS` and
  `AI_TUTOR_OUTPUT_PRICE_MICRO_USD_PER_MILLION_TOKENS` are injected integer
  micro-USD prices; the route stores an estimate but does not return cost to the
  learner. Refresh these values against the [official DeepSeek pricing page](https://api-docs.deepseek.com/quick_start/pricing)
  before enabling or budgeting a release.
- DeepSeek documents the OpenAI-compatible Chat Completions endpoint, V4 Flash,
  and the `thinking` field used by this configuration. See the
  [official Chat Completions API](https://api-docs.deepseek.com/api/create-chat-completion).

## Vietnamese personalization contract

Each future tutor turn has an explicit learner preference: target language,
learning objective, explanation depth, and tone. The system prompt uses the
validated preference but keeps safety and source limits server-owned. It asks
the model for Vietnamese assessment, explanation, example, frequent VN learner
mistake, next exercise, and a source boundary. Model text never authorizes a
write, tool call, or navigation side effect.

Every public turn will also carry a client-generated `conversationId` and
`turnId` UUID. The durable route must bind both identities to the learner and
payload hash before it invokes a provider, so a retry resumes the same turn or
fails rather than creating a duplicate provider charge. The database state machine
reserves an hourly turn/cost budget, reclaims stale leases without leaking a
reservation, and records normalized provider failure codes.

The route currently sends only the validated learner request and an explicit
Vietnamese source-boundary instruction. It does not claim that a response is based
on a lesson: only a future server-owned retrieval context may add published lesson
content after provenance `ai_provider_processing_allowed` and enrollment checks.

## Release blockers

- Rotate the credential pasted into chat and load the replacement only from a
  deployment secret store.
- Approve vendor DPA, region, retention, budget, alert and kill thresholds.
- The durable turn/rate-limit/deletion boundary is implemented; verify the
  `supabase/tests/ai_tutor_turn_ledger_test.sql` suite before changing it.
- Add grounded retrieval, direct SSE partial persistence/reconnect semantics, and
  golden-set/injection evaluations before enabling a learner-facing chat UI.
