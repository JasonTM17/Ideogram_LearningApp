# API Contract

## Current implemented endpoint

| Method | Path             | Auth | Request | Response               | Status      |
| ------ | ---------------- | ---- | ------- | ---------------------- | ----------- |
| GET    | `/api/v1/health` | None | None    | Shared health contract | Implemented |

## Health response shape

Shared contract source: `packages/contracts/src/api.ts`

| Field       | Value                   |
| ----------- | ----------------------- |
| `service`   | `ideogram-learning-api` |
| `status`    | `ok`                    |
| `timestamp` | ISO string              |
| `version`   | `v1`                    |

The route handler at `apps/web/src/app/api/v1/health/route.ts` returns this shared health contract via `Response.json(...)`.

## Shared API error shape

`packages/contracts/src/api.ts` also defines a shared error payload shape for future endpoints:

- `code`
- `message`
- `requestId`

That error shape is not yet used by any implemented route.

## Planned endpoints

No other endpoint is implemented today. Any future route should be versioned under `/api/v1` and documented here only after it exists in source.

## Verification notes

- The current health route has a passing route test.
- The contract is shared between the route and the contracts package.
