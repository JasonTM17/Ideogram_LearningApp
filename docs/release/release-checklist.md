# Release Checklist

Use this checklist for the first honest beta release. A checked item requires
evidence from the exact release commit; local source existence is not enough.

## Repository package

- [x] README, architecture, roadmap, screenshots, and GIFs are source-controlled.
- [x] License scope and content/media exceptions are explicit.
- [x] Security, contributing, conduct, ownership, issue, and PR policies exist.
- [x] Protected `main` requires a pull request, fresh quality/database checks,
      linear history, and resolved conversations; force-push and deletion are
      disabled.
- [ ] Changelog entry and GitHub release notes match the selected commit.

## Quality gates

- [x] Format, lint, typecheck, unit/contract tests, build, and content lint pass locally.
- [ ] Browser E2E covers authenticated critical paths and account switching.
- [ ] Native-device smoke covers auth, placement, offline replay, and background task behavior.
- [ ] Accessibility and coverage thresholds run in CI.
- [ ] Container publication waits for exact-commit CI success.

## Runtime and artifacts

- [ ] Web and worker images are non-root, scanned, smoke-tested by digest, and published to approved registries.
- [ ] Hosted web, worker, database credentials, monitoring, rollback, and restore drills are verified.
- [ ] Android/iOS build channels and signing ownership are documented.
- [ ] Offline audio rights, reviewers, checksums, and browser/device playback are approved.

## Release notes must say

- internal beta or production status;
- implemented surfaces and exact limitations;
- image/package tags plus immutable digest;
- validation commit and CI run;
- migration, rollback, and known-data-risk notes.
