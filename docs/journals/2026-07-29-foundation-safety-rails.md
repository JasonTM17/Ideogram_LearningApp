# Phase 1 Foundation Safety Rails

**Date**: 2026-07-29 17:14  
**Severity**: High  
**Component**: foundation tooling, import boundaries, env validation, CI gates  
**Status**: Resolved

## What Happened

Phase 1 looked green on paper, but the first adversarial review proved the safety rails were porous. We tightened the foundation around the actual failure modes: platform boundary enforcement, dotenv validation, and CI range checks. The work landed in the root tooling, not the feature app, because the bug was in the guardrails themselves.

## The Brutal Truth

This was the kind of bug that makes a clean lint run feel dishonest. The first pass allowed real bypasses through dynamic loaders, normalized relative imports, and file-backed dotenv paths. That is exactly how a “secure by convention” repo turns into a repo that only looks secure until someone tries the wrong import string.

## Technical Details

The first review found bypasses in three places: JS/dynamic import coverage, raw relative-path matching, and file-backed secret loading. The second pass closed them by switching to an AST-backed import-boundary rule, resolving paths before comparing app roots, scanning dotenv candidates with symlink following, and hardening CI commit-range handling. One concrete checkpoint: `corepack pnpm check:boundaries` now returns `40/40 passed`.

CI also got a narrower trust boundary: checkout credentials are no longer persisted, and direct-push commit ranges are checked instead of only PR ranges. The remaining production audit item is the Expo `uuid@7.0.3` transitive advisory; we accepted it as upstream packaging debt because the repo does not have a safe compatible override path today.

## What We Tried

We first treated lint as the control plane, then proved that was too weak. After that, we added adversarial probes for dynamic imports, normalized traversal, future shared packages, client-only web modules, and file-backed env leakage. We also kept the audit gate at `high` instead of widening the release block to a moderate upstream advisory.

## Root Cause Analysis

The root cause was trusting string-based checks and happy-path probes too much. They catch obvious mistakes and miss the exact sort of boundary crossing an attacker or careless refactor will use. The disclosed DeepSeek credential was never stored in the repo or committed, but it is still a real secret disclosure and must be rotated.

## Lessons Learned

Guardrails have to be adversarial, not polite. If a rule only works on canonical strings, a normalizer will break it. If it only checks process env, a framework dotenv loader will bypass it. If CI only validates PR ranges, direct pushes need their own path.

## Next Steps

Phase 2 should inherit these rails unchanged and keep probing them. Security owner should rotate the disclosed API key immediately, then confirm no secret material was written to disk. Platform owner should keep watching the Expo advisory and re-test if upstream changes the `xcode -> uuid` chain.

## Unresolved Questions

- Who is the named owner for rotating the disclosed DeepSeek credential?
- Do we want to keep accepting the Expo `uuid` moderate advisory until upstream fixes the dependency chain, or gate future releases on a follow-up exception process?
- Should Phase 2 add a dedicated regression test for file-backed dotenv leaks on Linux CI?
