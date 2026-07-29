---
phase: 7
title: "Media Offline and Sync"
status: pending
effort: "10–14 engineer-days"
---

# Phase 7: Media Offline and Sync

## Context and outcome

Make mobile study resilient to intermittent networks and add privacy-safe
listening/speaking media. Local state improves continuity; Supabase remains the
canonical authorization and progress source.

**Depends on:** Phases 2–3, 5 and the Phase 6 job/grading contract.
**Unblocks:** reliable mobile beta and production media workflows.

## File ownership

Create/modify:

- `packages/sync/src/*`, `packages/media/src/*`
- `packages/contracts/src/{sync,media,notifications}/*`
- `packages/api-client/src/{sync,media}/*`
- `apps/web/app/api/v1/{sync,media,notifications}/*`
- `apps/mobile/src/{offline,media,notifications}/*`
- `apps/mobile/src/features/{lesson,review}/media-*`
- `apps/web/src/features/lesson/media-*`
- `apps/worker/src/jobs/{transcription,tts,audio-cleanup,notification}/*`
- `supabase/migrations/0006_media-offline-and-notifications.sql`
- `supabase/tests/media-storage-and-sync.sql`
- `docs/offline-sync-contract.md`, `docs/media-privacy-guide.md`
- updates to `docs/api-contract.md` and `docs/data-lifecycle-matrix.md`

Phase 6 provider gateway is consumed through its contract, not rewritten.

## Requirements and architecture

- Use SQLCipher-backed Expo SQLite for downloaded content, pending mutations and
  sync cursors, with app key in SecureStore and OS-backup exclusion. FileSystem
  holds checksum/versioned audio/downloads outside backup. Key/cache wipe is
  part of logout/deletion.
- Sync uses client-generated operation IDs, server idempotency, monotonic
  server/causal sequence and explicit conflict strategy: append-only review
  events preserve distinct operations; preferences use compare-and-set; content
  is read-only/versioned; destructive profile changes require online confirm.
- Bind queue, cache, request and response to `user_id + session_epoch`. Logout/
  account switch atomically stops sync, aborts/awaits in-flight requests and
  quarantines/purges the prior namespace before another account is accepted.
- Download manifest includes content version, locale, checksums, expiry and
  required media plus immutable `content_release_id`. Partial/corrupt/stale
  generation downloads never appear as available.
- Listening always provides transcript, replay and speed. Recording requires
  contextual rationale/consent, visible recording state, stop/playback/delete
  and no background recording.
- Audio uses private Storage, short-lived signed access and retention cleanup.
  Raw voice is not retained longer than the approved grading/retry window.
- Deletion tombstones cancel pending uploads/jobs, revoke signed URLs, purge
  local/Storage/provider/derived copies and prevent offline replay before the
  request is acknowledged complete.
- Notifications are opt-in, timezone/quiet-hours aware, derived from canonical
  due data and harmless on duplicate delivery.

## Implementation steps

1. Implement the Phase 3 frozen sync protocol and endpoint matrix; include
   schema upgrade, server sequence, payload-hash idempotency, session epoch and
   forced-resync behavior.
2. Build encrypted local schema, migration runner, transaction wrapper,
   per-account mutation queue, backup exclusion and bounded retry/backoff.
3. Implement pull manifest/content and push mutation loops with connectivity,
   foreground/background and logout handling. Never sync under a previous user.
4. Add versioned download manager with checksum validation, storage quota,
   cancel/resume, orphan cleanup and accessible progress UI.
5. Add web/native listening controls, transcripts, slow mode and error states;
   prefer pre-produced reviewed audio where available.
6. Add recording consent and private upload; enqueue idempotent transcription/
   media jobs, then request Phase 6-owned grading through its frozen envelope;
   expose cancel/delete/retention state.
7. Add notification token ownership, schedule preference and revocation; remove
   invalid tokens and avoid embedding sensitive lesson content in push payloads.
8. Commit sync contract/store → download/listening → recording/jobs →
   notifications/tests.

## Verification and acceptance

- Property/integration tests cover duplicate/out-of-order mutations, stale
  cursor, clock skew, two devices, process death mid-transaction, delayed
  old-session response, token refresh/user switch and forced resync.
- Network matrix: offline launch, connection drop during lesson/review/upload,
  retry after app restart, low storage and corrupted file.
- Storage/RLS tests cover cross-user object reads, path traversal, expired URL,
  unauthorized delete and cleanup worker ownership.
- Manual iOS/Android checks cover microphone denial/revocation, Bluetooth/audio
  interruption, accessibility labels and notification quiet hours.
- Account deletion while offline/in-flight cancels/quarantines work, wipes the
  encryption key/cache, revokes URLs and cannot resurrect data after reconnect.
- Sync metrics show zero duplicate progress credit in the test suite.

## Risks, rollback and security

- **Risk:** local/server divergence silently changes schedule. Use append-only
  server sequences, session epochs, operation IDs, conflict telemetry and
  visible last-sync state.
- **Risk:** voice remains after user deletion. Centralize object ownership and
  retention jobs; reconcile orphan objects.
- **Rollback:** version protocol and local schema; preserve backward-compatible
  server endpoints for the previous supported mobile binary.
- **Security:** exclude tokens/raw audio/answers from logs, secure local session
  state, exclude backups/app-switcher previews where required and clear the
  per-user encryption key/cache on logout/account deletion.

## Completion checklist

- [ ] Offline lesson/review resume and sync without double credit.
- [ ] Downloads verify integrity and clean up safely.
- [ ] Recording consent, retention and deletion are user-visible and tested.
- [ ] Notification and sync behavior survives real-device interruption tests.
