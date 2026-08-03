# Artifact and Package Matrix

This matrix separates what is published today from the artifacts required by
the production roadmap.

| Artifact                   | Registry or channel              | Current state                                                       | Required proof                                                                      |
| -------------------------- | -------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Web container              | GHCR `ideogram-learning-app/web` | Published from `main`                                               | CI-gated build, digest smoke, vulnerability scan, signature verification            |
| Web container              | Docker Hub                       | Release-tag mirror configured; credentials external                 | Same semantic/full-SHA tags and digest evidence as GHCR                             |
| Placement worker container | GHCR and Docker Hub              | Packaged and locally verified; publication waits for green merge CI | Non-root image, enabled-startup smoke, clean vulnerability scan, immutable digest   |
| Expo Android build         | EAS/internal track               | Not configured                                                      | Signed build, device smoke, rollback/version policy                                 |
| Expo iOS build             | EAS/TestFlight                   | Not configured                                                      | Signed build, device smoke, Universal Link proof                                    |
| Offline audio bundle       | Approved CDN/object store        | Unavailable                                                         | Named reviewers, redistribution approval, SHA-256 registry, browser/device playback |
| Source archive             | GitHub Release                   | Not published                                                       | Exact green commit, release notes, limitations, checksums                           |

## Existing web image

```bash
docker pull ghcr.io/jasontm17/ideogram-learning-app/web:latest
docker pull ghcr.io/jasontm17/ideogram-learning-app/web:sha-<commit>
```

Use the immutable digest for evidence and rollback. `sha-*` is a convenient
commit-addressed tag, but registry tags can be moved and are not themselves an
immutability boundary. The mutable `latest` tag is only for inspection.

The current workflow emits new `sha-*` tags with the full 40-character Git
commit; legacy short-SHA tags can remain in registry history. GHCR receives
green default-branch builds. Docker Hub receives only strict SemVer release-tag
builds when its protected credentials are configured. The workflow builds and
loads one local artifact, smoke-tests and scans it before publication, pushes
that same artifact without rebuilding, and verifies the resulting registry
digest resolves to the tested image identity. Release tags must reference a commit already on
protected `main`, and the `container-release` environment requires maintainer
approval before registry credentials can be used.

## Release rule

Do not create a semantic tag merely to make the GitHub sidebar look complete.
Cut a release only when the exact commit passes CI and the applicable items in
[`release-checklist.md`](./release-checklist.md) are recorded with real proof.
