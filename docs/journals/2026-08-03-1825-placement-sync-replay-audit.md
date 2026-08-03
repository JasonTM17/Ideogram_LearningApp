# Placement, Sync, and Replay Debt

**Date**: 2026-08-03 18:25  
**Severity**: High  
**Component**: placement seed/scorer, web/native durable sync, offline-media governance, session/account replay paths  
**Status**: Resolved

## What Happened

We finished the placement seed and scorer wiring, tightened web and native durable sync, and put the offline-media source path under governance so only approved source content can flow into the package. Review also caught two ugly replay bugs: one in session handling and one in account-level mutation reuse. Both were fixed by binding retries to the correct durable identity instead of trusting stale request state.

The hard lesson from the package PR was simple: green does not mean portable. A package can pass its own checks and still be incompatible with Expo at integration time. We do not get to call that done just because the package build went green in isolation.

## The Brutal Truth

This was a lot of cleanup that should have been less slippery than it was. The replay bugs were the kind of thing that look harmless until they start reusing stale state across a boundary that was supposed to be idempotent. The offline-media path was also too easy to drift into "just let it ship" mode, which is how you end up with content flow that is technically working and still not governed. Annoying, but predictable.

## Technical Details

- Placement seed/scorer now share the same contract, so seeded placement data can be scored without inventing a second interpretation of the payload.
- Web and native durable sync now use the same retry identity model, so the queue does not lose track of which mutation owns the receipt.
- Offline-media source selection is now constrained to the governed path instead of ad hoc asset pickup.
- Reviewer-found replay issues were fixed by rejecting stale session/account state before the mutation path could reuse it.
- The package PR was green, but Expo integration proved incompatible, so package CI alone was not enough proof.
- No approved proof exists yet for audio runtime, deployed worker runtime, or end-to-end media execution in the target environment.
- Validation known from this session: full `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`; DB split results were `27/52/33/29`; lock-order regression stayed green.

## What We Tried

We kept the replay fixes inside the durable boundary instead of papering over them in the client. We rejected a "works in package PR" definition of done because it would have hidden the Expo mismatch until later, which would have been worse. We also refused to bless offline-media flow without a governed source path.

## Root Cause Analysis

The root cause was trust in intermediate success signals. Passing package checks, passing a narrow queue test, or having a seeded scorer path does not prove the full product path. The session/account replay bugs came from reusing state that should have been invalidated. The Expo mismatch came from assuming package-level success implied app-level compatibility. That assumption was wrong.

## Lessons Learned

If a mutation can be retried, its identity and replay window have to be explicit and durable. If media is governed, the source path has to be enforced, not documented. And if a package PR is only green in isolation, it is not proof of integration safety. We need to stop treating partial green as delivery.

## Next Steps

Keep proving the missing runtime claims: approved audio, deployed worker behavior, and the actual target-environment media path. Do not widen scope until those are real, reproducible, and logged against the live runtime.

Status: DONE
Summary: Placement, sync, replay, and offline-media boundaries are tighter; package-only green was not enough, and that failure was useful.
Concerns: No approved proof yet for audio runtime, deployed worker runtime, or live target-environment media execution.
