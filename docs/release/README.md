# Release Docs

These docs separate source evidence from production proof. Use them when you
need to decide whether the repo is ready for a repository preview, a handoff,
or a limitation note. The current release is a pre-beta foundation, not a
production claim.

## Current Prerelease

[`v0.1.0-alpha.2`](https://github.com/JasonTM17/Ideogram_LearningApp/releases/tag/v0.1.0-alpha.2)
is the current repository/container preview. It points to commit
`81d2b1239077877846d6b3cf78398c679f1652d2`; see
[validation evidence](./validation-evidence.md) for final tag/main CI runs,
immutable GHCR digests, and the deterministic source checksum. Docker Hub
remains unpublished for this prerelease.

## Contents

- [Validation evidence](./validation-evidence.md) - what counts as local proof and what does not
- [Known limitations](./known-limitations.md) - explicit non-goals and unproven boundaries
- [Artifact and package matrix](./artifact-matrix.md) - published and planned deliverables
- [Release checklist](./release-checklist.md) - exact gates for an honest repository preview release

## Quick Start

Read [validation evidence](./validation-evidence.md) and the
[release checklist](./release-checklist.md) before creating a tag, GitHub
release, or mutable container tag.
