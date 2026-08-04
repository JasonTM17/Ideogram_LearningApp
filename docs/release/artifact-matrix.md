# Artifact and Package Matrix

This matrix separates what is published today from the artifacts required by
the production roadmap.

| Artifact                   | Registry or channel                 | Current state                                                                                                                                      | Required proof                                                                      |
| -------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Web container              | GHCR `ideogram-learning-app/web`    | Published from protected `main` with SBOM/provenance; verified digest `sha256:0e51a7b62bab56714892a5f81580c741489d2dbeae80fa6c161a82285c53d148`    | CI-gated build, startup smoke, vulnerability scan, digest and image-identity proof  |
| Placement worker container | GHCR `ideogram-learning-app/worker` | Published from protected `main` with SBOM/provenance; verified digest `sha256:09472638a09bef3c0945a42fb111efb7fbc3df8320a6b30661b256718a1b4d50`    | Non-root image, enabled-startup smoke, clean vulnerability scan, immutable digest   |
| Web and worker containers  | Docker Hub                          | Not published for `v0.1.0-alpha.1`; protected credentials were unavailable                                                                         | Same semantic/full-SHA tags and digest evidence as GHCR when the mirror is enabled  |
| Expo Android build         | EAS/internal track                  | Not configured                                                                                                                                     | Signed build, device smoke, rollback/version policy                                 |
| Expo iOS build             | EAS/TestFlight                      | Not configured                                                                                                                                     | Signed build, device smoke, Universal Link proof                                    |
| Offline audio bundle       | Approved CDN/object store           | Unavailable                                                                                                                                        | Named reviewers, redistribution approval, SHA-256 registry, browser/device playback |
| Source archive             | GitHub prerelease                   | `v0.1.0-alpha.1` repository preview from commit `666606f5e753a2e837cbde724d58f04f6e931d94`; tag CI run `30832398321`; final main run `30831885227` | Exact green commit, release notes, limitations, and checksum status                 |

## Existing container images

```bash
docker pull ghcr.io/jasontm17/ideogram-learning-app/web:v0.1.0-alpha.1
docker pull ghcr.io/jasontm17/ideogram-learning-app/web@sha256:0e51a7b62bab56714892a5f81580c741489d2dbeae80fa6c161a82285c53d148
docker pull ghcr.io/jasontm17/ideogram-learning-app/worker:v0.1.0-alpha.1
docker pull ghcr.io/jasontm17/ideogram-learning-app/worker@sha256:09472638a09bef3c0945a42fb111efb7fbc3df8320a6b30661b256718a1b4d50
docker pull ghcr.io/jasontm17/ideogram-learning-app/web:latest
docker pull ghcr.io/jasontm17/ideogram-learning-app/worker:latest
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
digest resolves to the tested image identity. Release tags must reference a
commit already on protected `main`, and the `container-release` environment
requires maintainer approval before registry credentials can be used.

Images built after this documentation polish also carry OCI `version`,
`revision`, `created`, and `licenses=MIT` metadata sourced from the exact CI ref
and commit. The existing `v0.1.0-alpha.1` digest claims above remain limited to
the metadata and attestations published by that original run.

The `v0.1.0-alpha.1` prerelease was cut from commit
`666606f5e753a2e837cbde724d58f04f6e931d94`. The release assets include the GHCR
digests above; no checksum asset was attached, and Docker Hub did not publish
because the protected credentials were unavailable for this run.

## Release rule

Do not create a semantic tag merely to make the GitHub sidebar look complete.
Cut a release only when the exact commit passes CI and the applicable items in
[`release-checklist.md`](./release-checklist.md) are recorded with real proof.
