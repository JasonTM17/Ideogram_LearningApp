# Placement Scorer Failure

## Symptoms

- `apps/worker` logs `placement scoring worker could not start.`
- `apps/worker` logs repeated `placement scoring cycle failed.`
- `private.placement_scoring_jobs` keeps `pending` or `processing` rows while submitted placement sessions do not reach `scored`
- A placement session stays in `submitted` state longer than expected

## Safe checks

1. Confirm the worker was started with `PLACEMENT_SCORING_WORKER_ENABLED=true`.
2. Confirm `PLACEMENT_SCORING_POLL_INTERVAL_MS` is between `1000` and `300000`.
3. Inspect whether the worker has a valid `PLACEMENT_SCORING_WORKER_ID`.
4. Check `private.placement_scoring_jobs` for stale `processing` leases or queued rows.
5. Check the matching `public.placement_sessions` row for `submitted`, `scored`, or `completed` status.
6. Confirm the placement bank exists from `supabase/migrations/20260803002000_publish_japanese_n5_placement_and_scoring_jobs.sql`.

## Recovery

- If the worker process is down, restart it with the same environment.
- If the poll interval is invalid, fix the environment and restart.
- If a job is waiting on an expired lease, let the worker claim it again rather than editing the job row by hand.
- If the session remains `submitted` because the scorer is not deployed, keep the session queued; do not claim the placement is scored.

## Guardrails

- Do not run manual scoring SQL in place of the worker path.
- Do not edit `private.placement_scoring_jobs` unless the incident owner approves a controlled repair.
- Do not treat the source migration as proof of a deployed worker.

## Related docs

- [API contract](../api-contract.md)
- [System architecture](../system-architecture.md)
- [Release known limitations](../release/known-limitations.md)
