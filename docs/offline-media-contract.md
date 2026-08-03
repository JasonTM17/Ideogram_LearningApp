# Offline Media Contract

## Scope

The repository contains checksum-bound cache infrastructure and web/Expo
download, playback, cancellation, and removal controls for approved MP3 assets.
It does not contain a released learner audio file or deployed CDN/storage path.
The current UI therefore renders a truthful unavailable state rather than a
disabled or placeholder download.

## Asset declaration

`offlineMediaAssetSchema` accepts only a bounded `audio/mpeg` declaration. A
caller must also supply the authenticated user and matching `contentReleaseId`
through `offlineMediaCacheNamespaceSchema`; cache ownership is not inferred
from the media URL.

| Field              | Rule                                                            |
| ------------------ | --------------------------------------------------------------- |
| `assetId`          | Stable lower-case key, 3-120 characters                         |
| `activityId`       | Published listening activity key                                |
| `contentReleaseId` | Stable published release identifier; must match cache namespace |
| `lessonId`         | Owning published lesson key                                     |
| `url`              | Stable HTTPS delivery URL without credentials/query tokens      |
| `sizeBytes`        | Positive and at most 50 MiB                                     |
| `sha256`           | Required lower-case SHA-256 checksum                            |
| `titleVietnamese`  | Learner-facing audio title                                      |

One authenticated manifest contains at most one release and 25 assets. Asset
URLs are at most 2,000 characters. The declared total for a web account cache is
bounded to 50 MiB before any download starts.

One authenticated manifest contains at most one release and 25 assets. Asset
URLs are at most 2,000 characters. The declared total for a web account cache is
bounded to 50 MiB before any download starts.

An authored listening activity remains unavailable for offline delivery until
its content-governance record is `recorded`, has the matching checksum, and is
reviewed/published. No placeholder audio may be registered to bypass that gate.

## Runtime behavior

- `pnpm generate:offline-media-manifest` reads the governed release, rights
  status, and recorded-asset registry. Pending rights or an unpublished release
  always generate `availability: unavailable`; an eligible recorded file must
  match its local SHA-256 and stable public HTTPS URL.
- `GET /api/v1/learning/offline-media` authenticates the learner and applies the
  release/rights gate again before returning the shared manifest.
- Web verifies response size and SHA-256 before publishing an immutable
  checksum-keyed entry to `Cache Storage`.
  The cache is account-scoped (the index records the governed release), and
  its index is committed before replaced/evicted entries are removed, avoiding a
  false-ready state after a failed write. It evicts oldest entries to stay
  within 50 MiB. The service worker accepts
  explicit cache/clear messages only when the asset and namespace release IDs
  match.
- Expo downloads to a `.partial` file, verifies size and SHA-256, then promotes
  it with backup recovery so an interrupted replacement keeps the prior valid
  file. An abort signal cancels the native task;
  failure removes the partial file. The account cache has a 50 MiB budget and is wiped
  when a confirmed signed-out session reaches the native sync provider. Expo
  Audio provides explicit online/offline playback with no autoplay.
- Web clears all Ideogram offline-media namespaces after a successful local
  sign-out. Neither runtime treats a cached file as
  content authorization or learning completion.

## Evidence and limits

Unit tests cover the declaration, governed manifest, authenticated route,
browser checksum rejection, index-write recovery, cache inspection/removal,
and native checksum serialization. Typecheck/lint cover the Expo transfer and
audio adapters. Real browser, real-device, CDN, and playback tests still need a
reviewed recorded asset and must be captured before a release claim.

## Related docs

- [Content governance](./content-governance.md)
- [Offline sync contract](./offline-sync-contract.md)
- [Release limitations](./release/known-limitations.md)
