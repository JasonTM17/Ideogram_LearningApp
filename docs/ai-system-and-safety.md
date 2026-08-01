# AI System and Safety

## Current boundary

The AI package is a server-only foundation. It has no public route, no mobile
client import, no persisted conversation history, and no live credential in this
repository. A future route must add authenticated turn persistence, atomic rate
limits, grounded published-content retrieval, deletion handling, and evaluation
gates before exposing a tutor to learners.

## Provider contract

- `packages/ai/src/deepseek-tutor-configuration.ts` accepts only the approved
  HTTPS DeepSeek origin and `deepseek-v4-flash` model.
- `DEEPSEEK_API_KEY` is read only at the server boundary. Never use an
  `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*` variable for it.
- The gateway requests structured JSON, applies a 15-second maximum provider
  deadline, propagates caller cancellation, validates output with Zod, and
  exposes no tool execution surface.
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

## Release blockers

- Rotate the credential pasted into chat and load the replacement only from a
  deployment secret store.
- Approve vendor DPA, region, retention, budget, alert and kill thresholds.
- Add the durable turn/rate-limit/retrieval/deletion boundary described in
  Phase 6, then run the golden-set and injection evaluations.
