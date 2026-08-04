# Artifact and Package Matrix

This matrix separates what is published today from the artifacts required by
the production roadmap.

| Artifact                   | Registry or channel                 | Current state                                                                                                                                                                                                                                                                                  | Required proof                                                                                    |
| -------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Web container              | GHCR `ideogram-learning-app/web`    | Published from protected `main` with SBOM/provenance; verified digest `sha256:a0f5ba12566ee2a08e249d6189782be24075fcad8996a82b91077dc4cb043926`                                                                                                                                                | CI-gated build, startup smoke, vulnerability scan, digest and image-identity proof                |
| Placement worker container | GHCR `ideogram-learning-app/worker` | Published from protected `main` with SBOM/provenance; verified digest `sha256:e481ec304406ad512a400531469784ed7e36f57cacae630a486f1e3192bf4764`                                                                                                                                                | Non-root image, enabled-startup smoke, clean vulnerability scan, immutable digest                 |
| Web and worker containers  | Docker Hub                          | Not published for `v0.1.0-alpha.2`; protected credentials were unavailable                                                                                                                                                                                                                     | Same semantic/full-SHA tags and digest evidence as GHCR when the mirror is enabled                |
| Expo Android build         | EAS/internal track                  | Not configured                                                                                                                                                                                                                                                                                 | Signed build, device smoke, rollback/version policy                                               |
| Expo iOS build             | EAS/TestFlight                      | Not configured                                                                                                                                                                                                                                                                                 | Signed build, device smoke, Universal Link proof                                                  |
| Offline audio bundle       | Approved CDN/object store           | Unavailable                                                                                                                                                                                                                                                                                    | Named reviewers, redistribution approval, SHA-256 registry, browser/device playback               |
| Source archive             | GitHub prerelease                   | `v0.1.0-alpha.2` repository preview from commit `81d2b1239077877846d6b3cf78398c679f1652d2`; tag CI run `30873588546`; final main run `30873262910`; deterministic source tar.gz and `SHA256SUMS.txt` attached with checksum `940cda41d98d519540f3d583576cfa7d7abe34c05e46c91599888e0625a34002` | Exact green commit, release notes, limitations, checksum manifest, and deterministic source proof |

## Existing container images

```bash
docker pull ghcr.io/jasontm17/ideogram-learning-app/web:v0.1.0-alpha.2
docker pull ghcr.io/jasontm17/ideogram-learning-app/web@sha256:a0f5ba12566ee2a08e249d6189782be24075fcad8996a82b91077dc4cb043926
docker pull ghcr.io/jasontm17/ideogram-learning-app/worker:v0.1.0-alpha.2
docker pull ghcr.io/jasontm17/ideogram-learning-app/worker@sha256:e481ec304406ad512a400531469784ed7e36f57cacae630a486f1e3192bf4764
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
and commit. The existing `v0.1.0-alpha.2` digest claims above remain limited to
the metadata and attestations published by that original run.

The `v0.1.0-alpha.2` prerelease was cut from commit
`81d2b1239077877846d6b3cf78398c679f1652d2`. The release assets include the GHCR
digests above, a deterministic source tar.gz, `SHA256SUMS.txt`, social PNG, and
project-tour GIF; Docker Hub did not publish because the protected credentials
were unavailable for this run.

## Release rule

Do not create a semantic tag merely to make the GitHub sidebar look complete.
Cut a release only when the exact commit passes CI and the applicable items in
[`release-checklist.md`](./release-checklist.md) are recorded with real proof.
