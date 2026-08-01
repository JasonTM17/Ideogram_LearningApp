# Native activity identity review

## Scope

- `apps/mobile/src/lib/activity-operation/*`
- Native support and sync-boundary documentation
- Review of persistence, reinstall behavior, sequence allocation, and input validation

## Findings and resolution

| Severity | Finding | Resolution |
| -------- | ------- | ---------- |
| P1 | iOS Keychain values can survive uninstall/reinstall; a raw SecureStore value is not sufficient for a per-install stream. | Added a document-directory installation sentinel. When absent, the adapter deletes the retained operation identity before creating the new marker; cleanup errors fail closed. Added a reinstall simulation test. |
| P2 | The in-memory reservation lock covers one JavaScript runtime, not independent foreground/headless runtimes. | Documented the boundary. Background mutation workers must use a transactional counter before reserving independently; the durable queue remains a later phase. |
| P2 | Custom keys could fail later inside SecureStore instead of at construction. | Added a SecureStore-compatible key pattern and deterministic invalid-input coverage. |
| Info | The identity is an idempotency coordinate, not an authorization credential. | Kept authorization, release access, and evaluation on the server and documented the separation. |

## Verification

- Focused identity suite: 9/9 passed
- Mobile typecheck: passed
- Mobile lint: passed
- Workspace Prettier check: passed
- Documentation validation: 31 internal links and 23 config keys verified

## Release gates still open

- Exercise uninstall/reinstall on representative Android and iOS release builds;
  the repository tests cover the state transition but cannot prove store behavior
  on physical devices.
- Do not enable background/headless reservations until the queue uses a
  transactional persistence primitive (for example, SQLite/native atomic state).
