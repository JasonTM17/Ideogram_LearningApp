# Adult Eligibility Decision

## Decision

The closed beta is 18+ only and must fail closed until named product/legal sign-off is recorded.

## Current policy

- Minors are excluded from the current beta.
- No age gating workaround should weaken the fail-closed posture.
- Any future minors plan requires a separate approved decision record.

## Why this matters

- The product includes AI-guided learning, audio, and progress data.
- Launching without a clear eligibility decision creates privacy, consent, and store-review risk.

## Consequences

- Registration and onboarding must not imply minor support.
- Copy, help text, and beta invite flows should stay consistent with the adult-only gate.
- Product expansion to minors is a separate program, not a default extension of the beta.
- Supabase self-service signup is disabled by default. Phase 2 must add an
  approved, server-enforced adult eligibility and invite/registration path before
  re-enabling it.

## Open questions

- Name of the product/legal approver
- Any jurisdiction-specific restrictions that should be added before launch
