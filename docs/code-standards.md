# Code Standards

## Repository shape

| Area                     | Purpose                                                   | Current state    |
| ------------------------ | --------------------------------------------------------- | ---------------- |
| `apps/web`               | Next.js App Router web shell and canonical `/api/v1` host | Foundation shell |
| `apps/mobile`            | Expo native shell                                         | Foundation shell |
| `apps/worker`            | Node worker for future async jobs                         | Stub only        |
| `packages/contracts`     | Shared API and versioned data contracts                   | Active           |
| `packages/design-tokens` | Shared semantic color, spacing, and radius tokens         | Active           |
| `packages/config`        | Shared runtime/config helpers                             | Active           |
| `packages/testing`       | Shared test helpers and setup                             | Active           |

## Standards

- Keep server-only code out of mobile and browser public bundles.
- Prefer small, explicit contracts over inferred behavior.
- Keep shared packages platform-neutral.
- `pnpm lint` runs executable import-boundary probes before package linting;
  mobile and shared packages must reject Node, server-only, cross-app, dynamic
  non-literal, and CommonJS loader imports.
- Use TypeScript strictness and avoid widening types with `any`.
- Add tests with new public behavior, especially contract changes.
- Keep file names descriptive and kebab-case where new files are introduced.
- Use one runtime boundary per app: web, mobile, worker.

## API and contract rules

- `packages/contracts` owns shared API types.
- `GET /api/v1/health` is the only implemented route today.
- Future endpoints should be versioned under `/api/v1`.
- Error payloads should use the shared error payload shape from contracts.

## Environment and secrets

- `.env.example` is non-secret and is the only committed env reference.
- `DEEPSEEK_API_KEY` is server-only.
- Do not place secrets in `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*`.
- Local ignored env files are the expected place for developer secrets.
- `pnpm check:env` scans root and target runtime dotenv files without printing
  values; it rejects public AI-key names and validates the non-secret DeepSeek
  configuration contract.

## UI and design rules

- Web and mobile should follow the shared design tokens, not copied DOM shells.
- Use the editorial token set for current foundation screens.
- Keep platform-specific navigation and media controls native to each runtime.

## Testing and validation

- Run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, and `pnpm test` before shipping foundation changes.
- Run `pnpm build` for production validation.
- Use `pnpm supabase:start`, `pnpm supabase:status`, and `pnpm supabase:stop` for local backend workflow.
