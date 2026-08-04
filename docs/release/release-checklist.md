# Release Checklist

Use this checklist for the first honest repository preview release. A checked
item requires evidence from the exact release commit; local source existence is
not enough. The `v0.1.0-alpha.1` repository preview is a pre-beta foundation
and applies repository and container gates only. Product release remains
blocked by the unchecked browser, device, hosted runtime, and content/media
items below.

## Repository package

- [x] README, architecture, roadmap, screenshots, and GIFs are source-controlled.
- [x] License scope and content/media exceptions are explicit.
- [x] Security, contributing, conduct, ownership, issue, and PR policies exist.
- [x] Protected `main` requires a pull request, fresh quality/database checks,
      linear history, and resolved conversations; force-push and deletion are
      disabled.
- [x] Changelog entry and GitHub release notes match release commit
      `666606f5e753a2e837cbde724d58f04f6e931d94`.
- [ ] Attach a checksum manifest for deterministic source artifacts; the current
      prerelease only exposes GitHub-generated archives.

## Quality gates

- [x] Format, lint, typecheck, unit/contract tests, build, and content lint pass locally.
- [ ] Browser E2E covers authenticated critical paths and account switching.
- [ ] Native-device smoke covers auth, placement, offline replay, and background task behavior.
- [ ] Accessibility and coverage thresholds run in CI.
- [x] Container publication waits for exact-commit CI success.

## Runtime and artifacts

- [x] Web and worker images are non-root, scanned and smoke-tested before GHCR
      publication; pull-back identity matches the tested artifact.
- [ ] Hosted web, worker, database credentials, monitoring, rollback, and restore drills are verified.
- [ ] Android/iOS build channels and signing ownership are documented.
- [ ] Offline audio rights, reviewers, checksums, and browser/device playback are approved.

## Release notes must say

- repository preview or production status;
- implemented surfaces and exact limitations;
- image/package tags plus immutable digest;
- validation commit and CI run;
- migration, rollback, and known-data-risk notes.
