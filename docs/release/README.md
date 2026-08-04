# Release Docs

These docs separate source evidence from production proof. Use them when you
need to decide whether the repo is ready for a repository preview, a handoff,
or a limitation note. The current release is a pre-beta foundation, not a
production claim.

## Current Prerelease

[`v0.1.0-alpha.1`](https://github.com/JasonTM17/Ideogram_LearningApp/releases/tag/v0.1.0-alpha.1)
is the current repository/container preview. It points to commit
`666606f5e753a2e837cbde724d58f04f6e931d94`; see
[validation evidence](./validation-evidence.md) for final tag/main CI runs and
immutable GHCR digests. Docker Hub and source checksum assets were not published
for this prerelease.

## Contents

- [Validation evidence](./validation-evidence.md) - what counts as local proof and what does not
- [Known limitations](./known-limitations.md) - explicit non-goals and unproven boundaries
- [Artifact and package matrix](./artifact-matrix.md) - published and planned deliverables
- [Release checklist](./release-checklist.md) - exact gates for an honest repository preview release

## Quick Start

Read [validation evidence](./validation-evidence.md) and the
[release checklist](./release-checklist.md) before creating a tag, GitHub
release, or mutable container tag.
