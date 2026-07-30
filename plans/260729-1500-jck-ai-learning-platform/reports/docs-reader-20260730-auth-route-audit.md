# Read-only docs audit — 2026-07-30

## Scope and evidence

Read exactly:

- `README.md`
- `docs/system-architecture.md`
- `docs/api-contract.md`
- `docs/authentication-guide.md`
- `docs/codebase-summary.md`

Inspected current web/auth source under `apps/web/src/app`, `apps/web/src/server/auth`, `apps/web/src/lib/supabase`, learner pages, and relevant shared auth/API contracts. No documentation or source files were edited.

Validation run against the current worktree:

- Web auth/proxy tests: 4 files, 23 tests passed.
- Web health/catalog route tests: 2 files, 4 tests passed.
- Workspace typecheck: 10 packages passed.

## Verified current route and screen facts

### HTTP route inventory

| Method | Path | Current status and behavior |
| --- | --- | --- |
| `GET` | `/api/v1/health` | Implemented, unauthenticated shared health envelope. |
| `GET` | `/api/v1/learning/catalog` | Implemented, bearer or SSR-cookie `getUser()` auth, allowlisted catalog RPC, no-store response. |
| `POST` | `/api/v1/auth/email-otp` | Implemented. Validates `email`/`returnTo`, asks Supabase `signInWithOtp` with `shouldCreateUser: false`, stores a safe return cookie, returns generic `202 {accepted:true,message}`. Cookie-origin JSON mutation policy applies; provider/rate-limit failures map to `503`/`429`. |
| `GET` | `/auth/callback` | Implemented outside `/api/v1`. Rejects token-bearing query fields, consumes the return-path cookie, exchanges Supabase PKCE code (optional `sb_flow_id`), and redirects with `303` to a safe return path or `/sign-in?reason=...`. |
| `POST` | `/api/v1/auth/sign-out` | Implemented. Requires verified same-origin cookie session (bearer source is `403`) and an empty JSON object; calls `signOut({scope:'local'})`, returns `200 {signedOut:true}` with no-store headers. |

Source wrappers:

- `apps/web/src/app/api/v1/auth/email-otp/route.ts`
- `apps/web/src/app/auth/callback/route.ts`
- `apps/web/src/app/api/v1/auth/sign-out/route.ts`

There is no `POST /api/v1/auth/callback` route and no callback request builder in `packages/api-client/src/auth/auth-api-requests.ts`; the callback is a browser `GET` route handled by Supabase SSR.

### Current web screens

`/sign-in` is implemented. Protected learner pages now exist and all call `requireLearnerPageSession()`:

- Catalog-backed: `/today`, `/learn`, `/lessons/[lessonId]`.
- Profile/session: `/you` (verified email/profile shell plus sign-out), `/you/settings`.
- Placeholder/foundation states: `/review`, `/progress`, `/assistant`, `/help`.

The interactive placement/activity/review/progress/AI flows and learning mutation route handlers remain incomplete. Web server components currently call `readLearnerCatalog(client)` directly; they do not fetch `/api/v1/learning/catalog`. The HTTP catalog route remains the external/mobile/BFF surface.

## Per-document findings

### `README.md`

**Purpose:** Top-level product status, foundation scope, quick start/validation commands, environment guardrails, and documentation index.

**Stale or false sections:**

1. Intro paragraph (“learning product flows are not implemented yet”): too broad. Auth lifecycle and sign-in are implemented; catalog-backed learner pages and protected shell pages exist.
2. `Current foundation` bullet “Implemented API routes: health, catalog”: incomplete; omits `POST /api/v1/auth/email-otp`, `GET /auth/callback`, and `POST /api/v1/auth/sign-out`.
3. `Current foundation` bullet saying “user-facing learning screens are still pending”: false if it means routes/screens; they exist as catalog-backed or placeholder screens. Full interactive learning flows are still pending.
4. `What is not implemented yet`: the bullet “Next.js learning mutation routes and user-facing learning screens” should become “learning mutation routes and full interactive learning flows; learner shell/screens are present.” The “progress tracking” item should be narrowed to user-facing progress read/write flow, because progress/review persistence helpers and tables already exist.
5. `What is not implemented yet` endpoint sentence (“Any additional endpoint beyond health/catalog”): false. Replace with the route inventory above and explicitly note that callback is `/auth/callback`, not `/api/v1`.

**Verified replacement facts:** Keep “internal beta foundation,” Japanese-first/hidden `zh`/`ko`, review-only corpus, server-only AI key, and no production deployment claims. Add the implemented auth route inventory and distinguish UI shell from unimplemented mutations.

### `docs/system-architecture.md`

**Purpose:** Runtime topology, current implementation state, catalog data flow, database role boundaries, scale limits, identity/privacy boundary, planned architecture, and cross-document links.

**Stale or over-broad sections:**

1. `Current state`: says the only implemented HTTP routes are health/catalog. Add the three auth routes and the implemented protected learner page shell; keep learning mutation routes planned.
2. `Learner catalog read flow`: step 1 (“Web or mobile calls `GET /api/v1/learning/catalog`”) does not describe the current web implementation. `/today`, `/learn`, and lesson pages call `requireLearnerPageSession()` then `readLearnerCatalog()` directly from server components. Reframe as two paths: external/mobile HTTP clients use the catalog route; web SSR pages use the repository with the same RPC/assembler boundary.
3. `Learning persistence boundary` row “Web / mobile client → Next.js catalog route” should say “external/mobile client”; web server components bypass the HTTP route while remaining server-side and auth-bound.
4. `Learning persistence boundary` says `service_role` is “used” for scoring/purge. The worker runtime is still only a readiness stub; the migration helpers are provisioned/reserved, not executed by the current worker. Use “reserved for worker scoring/purge helpers.”
5. `Identity and privacy boundary` remains directionally correct, but should name the now-implemented OTP, callback, and sign-out handlers and state that Supabase SSR owns the web PKCE exchange.
6. `Planned behavior` sentence about `/api/v1/learning/*` mutations remains valid; add the already-implemented auth lifecycle routes so “planned” is not read as all auth being future work.

**Verified replacement facts:** Catalog RPC/budget/allowlist and DB role names remain accurate. The architecture diagram and related-doc links resolve, but the flow text should distinguish current route-led API from current web server-component reads.

### `docs/api-contract.md`

**Purpose:** Canonical HTTP contract table, health/error envelopes, database-private learning helper inventory, planned request contracts, catalog response/budget behavior, and verification notes.

**Stale or false sections:**

1. `Current implemented endpoints` table is missing all auth routes. Add:
   - `POST /api/v1/auth/email-otp` (generic `202` accepted envelope).
   - `GET /auth/callback` (303 redirect/code exchange; not versioned API).
   - `POST /api/v1/auth/sign-out` (`200 {signedOut:true}`, cookie session only).
2. `Planned HTTP endpoints` table incorrectly marks `/api/v1/auth/email-otp` and `/api/v1/auth/sign-out` as planned contract-only. They have route handlers and passing route tests.
3. The table’s `/api/v1/auth/callback` `POST` entry is wrong in both method and path. Delete it; callback is `GET /auth/callback`.
4. “Those request shapes live in `packages/api-client/src/auth/auth-api-requests.ts`” is false for callback: current client file contains email-OTP and sign-out builders only. The callback has no API-client request shape.
5. “The server route handlers do not exist yet” is false for all three auth lifecycle operations.
6. “Remaining ... user-facing learning screens are still planned” should be narrowed to full interactive/mutation flows. Add planned learning builders that are still contract-only (`POST /api/v1/learning/activities/submit`, `POST /api/v1/learning/reviews/submit`) if the table is intended to be exhaustive.
7. Shared error-shape prose scopes behavior to the catalog route only. Keep that statement for catalog, but add auth-specific statuses/redirect behavior to avoid implying auth routes return only `401/503` JSON.

**Verified replacement facts:** Health/catalog sections and aggregate limits remain accurate. The database helper table can stay, with an explicit “DB helper only; no HTTP handler yet” note for learning mutations.

### `docs/authentication-guide.md`

**Purpose:** Auth lifecycle design/guardrails, source-of-truth contracts, cookie/PKCE rules, not-yet-wired pieces, and launch questions.

**Stale or over-claimed sections:**

1. `Current state` says sign-in/callback/sign-out are contract-led and auth lifecycle routes are not implemented. Current `/sign-in`, OTP route, callback route, and sign-out route are implemented; only native/production pieces and some custom-provider contracts remain incomplete.
2. `Verified contracts` row “Planned API requests” claims callback exchange request shapes in `packages/api-client/src/auth/auth-api-requests.ts`; callback builder was removed and the file now has only email-OTP/sign-out plus privacy request builders. Rename the row and list exact route sources.
3. `Allowed flow` steps 3, 5, and 6 describe the generic `packages/auth` transaction-store/nonce adapter, not the current web path. The web route delegates PKCE cookies and code exchange to `@supabase/ssr` (`createSupabaseAuthRouteClient` + `exchangeCodeForSession`); no current source uses `consumeAuthorizationCallback` or `exchangeAuthorizationCode`. Split “current Supabase web flow” from “generic provider contract not wired yet.”
4. “Redirect URIs are matched exactly” is true for the generic package helper, but the current web route does not accept a caller-supplied redirect URI; it derives `/auth/callback` from trusted `APP_ORIGIN` and validates only a relative `returnTo`.
5. “Local credential cleanup starts before remote sign-out completes” is a package-level `signOutAndClearLocalSession` guarantee; the web sign-out route currently calls Supabase `signOut({scope:'local'})` directly. Qualify the claim as helper contract vs wired route.
6. `Not implemented yet` first bullet is false. Replace with native secure storage, production deep-link deployment, authoritative revocation checks, and an application-owned OIDC/nonce adapter if that path is still required.
7. Keep cookie hardening, strict bearer parsing, token-bearing callback rejection, generic OTP response, and 401/503 auth boundary claims, but identify whether each is route-level or package-level.

**Verified replacement facts:** Current web flow is invite-only OTP (`shouldCreateUser:false`) → Supabase SSR PKCE cookies → `GET /auth/callback` code exchange → safe 303 redirect; `/api/v1/auth/sign-out` requires cookie auth and empty JSON. Adult approval is enforced by the registration/Auth DB trigger path; the OTP route itself does not call a registration-approval RPC.

### `docs/codebase-summary.md`

**Purpose:** Dated snapshot of repository structure, current implementation details, planned scope, and evidence boundary.

**Stale or incomplete sections:**

1. Header says generated `2026-07-29`; current worktree includes 2026-07-30 auth/UI changes. Regenerate/update date after the feature state is settled.
2. `Snapshot` says only health and catalog are implemented HTTP endpoints. Add auth lifecycle routes and note protected learner pages.
3. `Top-level layout` `apps/web` row omits sign-in, learner pages, OTP/sign-out API routes, and callback route.
4. `Current implementation details` calls the web home page a “foundation placeholder.” It is now a public landing page with feature/trust sections and sign-in CTAs; call it a foundation landing page.
5. Add auth route/page details and the web SSR-vs-HTTP catalog distinction.
6. `What is only planned` bullet “user-facing learning screens” is stale; replace with full interactive learning/mutation flows. Keep AI/offline/admin/native storage/revocation items.
7. Auth package detail (“local sign-out cleanup”) should be labeled contract-level unless the web route is changed to use that helper.

**Verified replacement facts:** Seven shared packages, three app shells, DB persistence/RLS, catalog safety limits, hidden language packs, and evidence-boundary wording remain valid.

## Internal link and path audit

- All Markdown links in `README.md` and `docs/system-architecture.md` resolve in the current workspace; no broken file links found in the five requested docs.
- Content/path references requiring correction: `/api/v1/auth/callback` appears in `docs/api-contract.md` and `docs/authentication-guide.md`, but no such route exists. Use `GET /auth/callback`.
- `docs/api-contract.md` should add source links/paths for the three auth route wrappers and avoid attributing callback request shape to `packages/api-client/src/auth/auth-api-requests.ts`.
- `docs/authentication-guide.md` should cross-reference the actual web route modules (`apps/web/src/server/auth/*`, `auth-server-client.ts`, `auth-return-path.ts`) alongside generic `packages/auth` contracts.
- README’s documentation index itself needs no link-target changes.

## Recommended update order

1. Correct route inventory/path/method in `docs/api-contract.md` and `README.md`.
2. Split current-vs-generic auth flow in `docs/authentication-guide.md`.
3. Correct web SSR catalog flow and worker “reserved vs used” wording in `docs/system-architecture.md`.
4. Regenerate `docs/codebase-summary.md` from the final worktree and update the date.
5. Re-run docs link validation after edits.

## Unresolved questions

- Is the current Supabase SSR PKCE exchange the intended long-term auth implementation, or should the generic `packages/auth` callback/nonce adapter be wired later?
- Should the docs call `/api/v1/auth/email-otp` “unauthenticated” while still requiring same-origin cookie mutation headers?
- Should “implemented learner screens” include placeholder routes in the product status, or should status language reserve “implemented” for interactive learning flows?

Status: DONE
Summary: Read-only audit completed; route inventory and stale claims identified across all five requested docs, with verified replacement facts and path/link impacts.
Concerns/Blockers: Documentation is currently one feature slice behind the working tree; no docs were edited.
