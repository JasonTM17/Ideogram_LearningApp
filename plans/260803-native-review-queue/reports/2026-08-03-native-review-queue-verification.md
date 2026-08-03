# Native review queue verification — 2026-08-03

## Delivered

- Added authenticated `GET /api/v1/learning/reviews` with RLS-bound queue
  reads, shared response parsing, no-store headers, and route tests.
- Added native API-client queue read and review-submit methods with bearer
  transport tests.
- Replaced the Expo Review planned placeholder with an online vocabulary recall
  session. It loads the due queue plus learner-safe catalog, reveals the answer
  on demand, accepts `again`/`hard`/`good`/`easy`, retains retry input in
  memory, and advances only after the server receipt.
- Reused `ActivityAttemptLifecycle`, Expo SecureStore operation identity,
  session-bound cancellation, auth expiry handling, and accessibility
  announcements. No local SRS schedule or fabricated prompt is used.
- Fixed Expo web bundle evaluation by making the native `File` sentinel lazy;
  web route bundles can now import the native activity identity module without
  constructing the native-only file API at module load.
- Updated README, PDR, API contract, architecture, roadmap, mobile policy,
  review/sync contract, codebase summary, showcase copy, and Mermaid source.
  Regenerated `docs/media/system-architecture.{svg,png}` and the showcase PNG.

## Verification evidence

| Check | Result |
| --- | --- |
| Focused native review tests | 6 passed; full mobile suite 25 files / 115 tests passed |
| API-client focused/full coverage | 20 native HTTP tests; full package suite 87 tests passed |
| Web review route/repository tests | Route 3 passed; full web suite 45 files / 233 tests passed |
| Workspace lint/typecheck | 11/11 packages successful |
| Workspace test | 11/11 packages successful; root 20 tests, 1 intentional skip |
| Mobile Expo web export | Passed; 1,126 modules bundled |
| Workspace production build | 11/11 packages successful; web route list includes `/api/v1/learning/reviews` |
| Production dependency audit | 0 info/low/moderate/high/critical vulnerabilities |
| Supabase pgTAP | `review_idempotency_test.sql`: 52/52 passed after fresh local DB reset |
| Formatting/content/env/diff | Prettier, content lint, env contract, import boundaries, and `git diff --check` passed |
| Media assets | Architecture PNG 1784×716; architecture SVG 1886×756; mobile GIF 5×256×512 frames |

## Runtime visual check

The rebuilt Expo web export was served locally and inspected at phone-oriented
browser dimensions. The root shell and Review tab render the friendly empty
state and `Bắt đầu ôn tập` CTA; the evidence screenshot is
`2026-08-03-native-review-tab.png` in this folder. A safe authenticated account
was not provisioned for this run, so the actual due-card/receipt path remains
covered by contract, state, lifecycle, and server tests rather than claimed as
an end-to-end browser result.

## Docs validation note

`node .claude/scripts/validate-docs.cjs docs/` verified 35 internal links and 25
configuration keys. The validator also emits its existing parser warning for
the source-controlled Mermaid `.mmd` file; Mermaid itself regenerated and the
PNG was visually inspected successfully.

## Unresolved questions

- Provision a disposable authenticated local learner fixture for a future
  browser/device run of the due-card → receipt path.
- Native release validation still needs real iOS/Android builds, claimed HTTPS
  callback association, and store/runtime gates; this slice intentionally does
  not claim offline sync or production deployment.
