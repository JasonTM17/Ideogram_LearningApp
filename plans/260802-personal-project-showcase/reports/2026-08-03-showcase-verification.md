# Showcase verification

## Scope

The credential-free `/showcase` route, public-site entry points, architecture
visual, documentation, and middleware access boundary.

## Automated checks

All commands passed on 2026-08-03:

- `pnpm --filter @ideogram/web test -- src/proxy.test.ts src/app/showcase/page.test.tsx` — 13 tests.
- `pnpm --filter @ideogram/web lint` and `pnpm --filter @ideogram/web typecheck`.
- `pnpm format:check`, `pnpm content:lint`, `pnpm check:env`, `pnpm lint`,
  `pnpm typecheck`, `pnpm test`, and `pnpm build`.
- `node .claude/scripts/validate-docs.cjs docs/` — 20 documents, 35 internal
  links, 25 configuration keys.
- `pnpm audit --prod --json` — zero production dependency vulnerabilities.
- `git diff --check`.

## Rendered checks

- Desktop and 375 px mobile layouts were inspected in a local Next.js session.
- The page exposes semantic headings, skip link, keyboard-reachable links, and
  responsive navigation.
- `/showcase` returned HTTP 200 without public Supabase configuration after the
  route was declared session-independent in middleware.
- The locally checked-in architecture PNG rendered at its declared dimensions.
- The lazy-loaded mobile GIF was inspected after scrolling it into view.

## Scope guard

The tour describes a beta honestly: it demonstrates source, architecture, and
available product paths, but does not pretend static assets are live backend
evidence or claim the target architecture is deployed.

## Unresolved questions

None for this showcase increment. The broader product roadmap remains active.
