# Learner Catalog API Documentation Scout

Date: 2026-07-29

## Scope and evidence

Read-only comparison of the requested documentation against:

- apps/web/src/app/api/v1/learning/catalog/route.ts
- apps/web/src/server/learning/learner-catalog-*.ts
- apps/web/src/lib/supabase/request-auth.ts
- apps/web/src/server/http/api-response.ts
- supabase/migrations/20260729203000_harden_learner_catalog_structure.sql
- supabase/tests/learner_catalog_security_test.sql and supabase/config.toml for the database-boundary claims

## Verified new behavior

1. GET /api/v1/learning/catalog is now a real Next.js Node.js route. It accepts a verified Supabase bearer token or the SSR cookie session, then calls client.auth.getUser rather than trusting a local session snapshot.
2. Missing, malformed, or normally rejected credentials become a typed 401 UNAUTHORIZED response. Unexpected authentication-provider failures and repository/integrity failures are normalized to 503 UNAVAILABLE; provider or database details are not returned.
3. Every response has no-store headers, X-Content-Type-Options: nosniff, and an opaque UUID requestId in both response body errors and X-Request-Id.
4. The route reads one database RPC, public.get_learner_catalog_data(), then validates its strict aggregate schema and builds the shared LearnerCatalogResponse. The API output is sorted deterministically and rejects malformed relations, timestamps, or answer-bearing payload fields.
5. The migration revokes authenticated direct SELECT from every learner-catalog source table and grants only EXECUTE on the aggregate safe RPC. It deep-projects an explicit allowlist of learner prompts, options, examples, vocabulary, and media metadata. Answers, correctness flags, rubrics, explanations, editorial/provenance fields, internal status, and source timestamps are excluded.
6. The safe RPC requires the authenticated role, returns only active language packs and published path/release/unit/lesson/activity structure, and returns six empty arrays for a frozen or revoked account. Anonymous invocation is denied.
7. The public schema is exposed through local Supabase Data API configuration. Therefore the raw source tables are closed, but an authenticated user can technically invoke the safe public RPC through the Data API. The web route is the canonical application integration, not an enforced exclusive transport boundary.

## File-specific documentation changes

### docs/api-contract.md

Stale claims:

- Lines 5-7 list only the health endpoint.
- Line 31 says the shared error shape is not used by any implemented route.
- Lines 49-50 say no /api/v1/learning HTTP route exists yet.

Required update:

- Add GET /api/v1/learning/catalog as Implemented. Document Auth as Supabase bearer token or SSR cookie session; request body as none; success as LearnerCatalogResponse; errors as 401 UNAUTHORIZED and 503 UNAVAILABLE.
- State the shared error envelope is now used by this route: code, message, requestId. Document that a UUID is also sent in X-Request-Id and all successful/error responses are private and no-store.
- Add a concise response hierarchy: languagePacks -> releases -> units -> lessons -> activities. Link the complete strict contract to packages/contracts/src/learning/learner-catalog-contract.ts instead of duplicating all fields.
- Add the security contract: only active packs and published content; learner-safe prompt payloads only; no answers, isCorrect, rubrics, explanations, provenance, or editorial/private columns.
- Replace the blanket “No /api/v1/learning/* HTTP route exists yet” note with “the catalog read route exists; placement, activity-submit, and review-submit routes remain planned.”
- Add verification references for route.test.ts, learner-catalog-repository.test.ts, learner-catalog-assembler.test.ts, and learner_catalog_security_test.sql after their gates are run by the owner.

### docs/system-architecture.md

Stale claims:

- Line 15 says GET /api/v1/health is the only implemented HTTP API route and that learning operations are not Next.js route handlers.
- Line 28 says Web/mobile clients have “None directly” as their allowed surface.
- Line 91 says /api/v1/learning/* route handlers remain planned work for Phase 4.

Required update:

- Change current-state wording to name the health endpoint and protected catalog endpoint.
- Add a learner catalog read flow to the architecture: web/mobile request -> Next.js /api/v1/learning/catalog -> Supabase getUser verification -> authenticated Supabase RPC -> allowlisted catalog response.
- Replace “None directly” with a precise split: application clients must not select raw catalog tables; the public aggregate RPC is executable by authenticated database users and is safe by construction; the canonical product path is the Next.js API route. This prevents a false claim of an enforcement that the current public RPC grant does not provide.
- Update planned behavior so only the remaining learning mutation routes are planned. State that the catalog endpoint does not itself use a service-role secret.
- In the learning persistence boundary table, add public.get_learner_catalog_data as an app-read surface owned by app_security_definer and executable by authenticated users, with private helpers unavailable to them.

### docs/security-and-privacy-baseline.md

No sentence is directly false about auth routes: the catalog endpoint is not a sign-in/sign-out route. It is nevertheless incomplete after this protected read surface was added.

Required update:

- Add a “protected API request verification” item: request-auth accepts a strict Bearer token or SSR cookie session and verifies identity with Supabase Auth getUser; it does not use getSession as proof.
- Add that normal credential rejection maps to 401 while unexpected Auth unavailability maps to 503, and error serialization is generic.
- Add the catalog data boundary: raw table SELECT is revoked for authenticated clients; public.get_learner_catalog_data is a SECURITY DEFINER, fixed-search-path, allowlist RPC; anonymous callers have no execute privilege.
- Amend the session-validation note. It currently says an authoritative GoTrue verification path is still future work. The catalog route now has such a GoTrue getUser verification path. Keep the remaining warning for high-risk mutations that still need the planned session-revocation/role-epoch policy, rather than overstating catalog authentication as full revocation proof.
- State that account status is rechecked in the RPC with private.is_active_account, yielding an empty catalog for frozen/revoked accounts.

### docs/authentication-guide.md

Stale/misleading claims:

- Lines 3-6 say authentication is contract-led and not route-led. Protected API authentication is now route-led, although authentication lifecycle routes are still absent.

Required update:

- Reframe “Current state” as: sign-in/callback/sign-out remain contract-led; protected server API verification is implemented for the catalog route.
- Add a verified contract row for apps/web/src/lib/supabase/request-auth.ts and describe the bearer/cookie modes plus getUser verification.
- Add guardrails for strict Authorization parsing, no persistent/refreshing bearer client, hardened cookie attributes, and 401 versus generic 503 behavior.
- Leave the “Not implemented yet” list for email OTP/callback/sign-out and native secure storage. Those entries remain accurate.

### docs/codebase-summary.md

Stale claims:

- Lines 10-12 say the health route is the only HTTP endpoint.
- Line 20 describes apps/web as only a shell and health endpoint.
- Lines 41-42 list all Next.js learning route handlers as planned.

Required update:

- Update the snapshot and apps/web row to include the protected learner-catalog route and its server-side assembly/auth modules.
- Add the safe aggregate catalog RPC and strict learner catalog contract to Current implementation details.
- Change planned work to “additional learning route handlers and learner screens” rather than all learning handlers.
- Mention that public catalog output is intentionally answer-free and raw content tables are no longer readable by authenticated clients.

### docs/project-roadmap.md

Stale claims:

- Phase 3 is marked In progress even though its persistence/security contract was completed before this endpoint.
- Phase 4 is marked Pending, while the Phase 4 catalog route and web request boundary now exist.
- Lines 34-35 say user-facing learning routes are still pending without excluding the newly implemented catalog read route.

Required update:

- Mark Phase 3 Complete if the owning plan’s verified completion record remains authoritative.
- Mark Phase 4 In progress and state its delivered slice: secure catalog read route and learner-safe data boundary. Keep screens and remaining learning mutation routes as pending work.

### docs/deployment-guide.md

No current claim is directly contradicted. Add a small operational note before a deployment guide claims this route is ready:

- The protected catalog route requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or their server aliases). URL validation accepts only an origin, HTTPS outside localhost/127.0.0.1, and no embedded credentials.
- Deployment smoke validation should cover 401 without credentials, 200 with an active verified learner, 503 normalization for unavailable Auth/data dependencies, and no-store/X-Request-Id headers.
- Continue stating that no production deployment has happened; this source evidence does not prove hosting, secrets, or live Supabase provisioning.

### README.md (supplemental, outside requested docs list)

Lines 3 and 12 still say the repository has a single health endpoint and no Next.js learning route handlers. Update it together with the codebase summary so onboarding material does not contradict the actual catalog endpoint.

## Documentation wording to avoid

- Do not say browser/mobile cannot invoke any database API: the safe public RPC is granted to authenticated and the public schema is exposed.
- Do not say the catalog endpoint proves immediate session revocation, role-epoch enforcement, enrollment authorization, or production readiness. Source evidence proves getUser authentication, active-account gating, and safe catalog projection only.
- Do not document a raw payload shape from the database. The public HTTP response is camelCase and must be described from the shared learner catalog contract, not the snake_case RPC data.
- Do not state that Chinese/Korean are exposed: only active packs are returned; current seeded hidden packs remain fail-closed.

## Suggested documentation order

1. Update docs/api-contract.md and docs/system-architecture.md together; they contain the primary stale claims.
2. Update security/authentication docs with the exact trust boundary and remaining session-revocation limitation.
3. Update codebase summary, roadmap, README, and deployment guidance after validation gates are green.

## Unresolved questions

- Product/security owner must decide whether the authenticated public RPC is an acceptable intentional direct Data API surface. If not, move it behind a non-public database boundary or remove authenticated EXECUTE and use a server-only credentialed path; documenting “no direct client access” alone would be inaccurate.
- The source validates safe catalog content, but it does not define pagination or conditional-fetch semantics. Document neither until an actual bounded/paged catalog contract is implemented.
