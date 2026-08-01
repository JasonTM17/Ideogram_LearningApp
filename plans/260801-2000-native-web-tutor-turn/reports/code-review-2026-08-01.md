# Tutor Slice Code Review

## Scope

- Shared request/receipt contract and Expo transport.
- Web cookie transport and the web assistant surface.
- Expo assistant state, session fencing, accessibility, and tokenized styling.
- Changes from `5bf042a` through the final retry/session/availability fixes.

## Spec compliance

| Requirement | Verdict | Evidence |
| --- | --- | --- |
| Shared public request and receipt boundary | Pass | `packages/api-client/src/ai/tutor-api-requests.ts` parses both contracts. |
| Native bearer/session transport | Pass | `submitTutorTurn` uses the existing native JSON, timeout, and session-provider boundary. |
| Web cookie transport with opaque errors | Pass | `tutor-turn-client.ts` validates first, uses same-origin cookies, and maps transport errors without response text. |
| Vietnamese web and Expo UI | Pass | Both surfaces render preferences and all six bounded response sections. |
| Duplicate/stale/cancel safety | Pass | Forms disable while pending; ambiguous retries preserve a pending `turnId`; abort/session scopes prevent stale state commits; meaningful edits reset prior state. |

## Edge-case and adversarial review

- Checked empty/oversized input before fetch, malformed/non-JSON receipts, `401`,
  `403`, `409`, `429`, `503`, network failure, and abort behavior.
- Checked stale-result paths: a web request observes `AbortSignal` before it can
  commit; the Expo request is bound to the native session epoch, disposed on
  unmount, and remounted under an account-specific session key.
- Checked XSS/secret boundary: response text is rendered as escaped React text;
  public clients have no `@ideogram/ai`, DeepSeek key, raw provider error, or
  learner identity in the client-side diff.
- Checked cookie mutation boundary: the web client stays same-origin; the
  existing server route owns authentication and origin policy.

## Findings and resolution

| Finding | Verdict | Resolution |
| --- | --- | --- |
| User could edit a web draft while the old request was pending. | Accepted | Textarea and preferences are disabled during submit; edits clear a stale ready/error state. |
| Dynamic response was not reliably surfaced to assistive technology. | Accepted | Web response gets polite live/focus behavior; Expo announces completion and exposes headings/radio groups. |
| Tutor surface hard-coded web colors and skipped dark semantic tokens. | Accepted | CSS moved to `tutor-assistant.css` using the established token system and 768px breakpoint. |
| Retry after timeout/network failure generated a fresh turn identity, bypassing the intended exact replay. | Accepted | `resolveTutorTurnIdentifiers` retains the pending ID until success, cancellation, or a meaningful draft change; both clients consume the helper. |
| A new mobile account could briefly inherit the prior in-memory draft/response. | Accepted | `AssistantScreen` keys the stateful tutor surface by auth session epoch; unauthenticated state renders only the sign-in panel. |
| Chinese/Korean could be selected even though their packs are hidden. | Accepted | Shared `tutorLanguageAvailability` marks them as future-release copy and disables selection on web and native. Server policy remains authoritative. |
| An expired native session offered a blind retry. | Accepted | Native error state retains the opaque `UNAUTHORIZED` code and offers sign-in instead. |
| Hidden provider response or source text might be rendered as HTML. | Rejected | React text nodes escape model output; no raw HTML API is used. |
| A cancelled request might commit after account change. | Rejected | Browser checks `AbortSignal`; Expo uses `createSessionBoundRequestSignal`, native transport is already tested for session changes, and the surface unmounts with the previous session key. |

## Verification

- `pnpm --filter @ideogram/contracts test` — 12 files, 54 tests passed.
- `pnpm --filter @ideogram/api-client test` — 8 files, 70 tests passed.
- `pnpm --filter @ideogram/web test` — 34 files, 193 tests passed.
- `pnpm --filter @ideogram/web typecheck`, `lint`, and production build — passed.
- `pnpm --filter @ideogram/mobile test` — 21 files, 114 tests passed.
- `pnpm --filter @ideogram/mobile typecheck`, `lint`, and web export — passed.
- `pnpm check:boundaries` — 42 probes passed.
- `pnpm check:env` — passed.
- `pnpm content:lint`, `pnpm format:check`, and docs validation — passed.
- Full workspace `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` — passed.
- GitHub CI run `30706641419` for `79570a5` — quality/build and database
  mutation regression jobs passed.
- GitHub Container Registry publish run `30706641413` — passed; public image
  exposes `sha-79570a5`, `main`, and `latest`. The immutable SHA tag's OCI
  manifest was inspected successfully after publishing.

## Note

The requested code-reviewer subagent exhausted its platform quota before it
could return a report. This review therefore records the controller's local
spec, checklist, and adversarial review with fresh command evidence.

Status: DONE
Concerns/Blockers: None for this bounded JSON slice. Grounded retrieval, SSE,
durable history, offline tutor queues, and enablement policy remain explicitly
out of scope.
