# Offline Sync Contract

## Delivered boundary

`@ideogram/sync` owns a platform-neutral durable queue. Web adapts its storage
port to IndexedDB; Expo adapts it to SecureStore. Both queue retryable activity,
review, placement-answer, and placement-submit writes. Each record keeps the validated original
body, idempotency key, operation ID, creation time, retry count, and a
`(userId, sessionEpoch)` namespace. The native Expo storage adapter is
`shared: true`, so queue ownership and cleanup run through the same shared
storage lock path.

## Invariants

- At most 50 mutations and 256 KiB of UTF-8 serialized data are retained per
  active namespace. A mutation can retry at most 20 times before becoming
  blocked for an explicit retry or discard decision.
- A record is removed only after its HTTP route returns a valid receipt.
- Drain is sequential. Retryable transport/server ambiguity stays pending;
  terminal auth/validation/conflict outcomes become blocked for user action.
- Restoring storage under another user or session epoch clears it before any
  network replay. The client never calculates SRS or placement scores locally.
- The native queue storage key migrated from v1 to v2 with
  `(userId, sessionEpoch)` in the key, and the migration keeps a valid owned
  v1 queue while replacing a corrupt v2 snapshot when ownership matches.

## UX and limits

Web shows a Vietnamese pending-sync card with a foreground “Đồng bộ ngay”
action and registers a service worker / Background Sync when the browser
supports it. Expo registers an OS-scheduled BackgroundTask when available; its
task uses the same receipt-gated drain and caps one wake at five mutations.
A queued write is never shown as server-complete. Local authenticated Chromium
proof now covers reload persistence and a receipt-gated Background Sync drain.
Production-host, cross-browser, and real-device execution remain validation
work because background scheduling is best-effort.
The native background executor unit tests cover the pure queue contract:
empty queue returns success without transport, cross-account or cross-session
state clears the queue before any transport call, missing native session
preserves queued work, retryable drain returns `failed`, a clean drain returns
`success`, and dependency errors return `failed`.
The executor also rechecks namespace after session lookup so a raced account
switch clears queued work before transport; that still proves executor
behavior, not real-device OS scheduling.
Foreground transport binds its live session provider to the queue namespace.
Background transport re-reads Supabase auth on every provider invocation, so
neither path retains a stale account token across the request boundary.
The native queue storage also uses an exclusive compare-and-clear cleanup
guard, so a stale background task for account A cannot clear a newer account B
queue unless the stored namespace still matches the expected owner.
The reader clears malformed snapshots and owner mismatches atomically under the
exclusive lock; invalid storage stays untouched only when ownership cannot be
proven and the clear path is intentionally withheld.
Approved listening media has a separate checksum-bound web/Expo cache contract;
the current governed manifest intentionally remains unavailable until a reviewed
recording and redistribution rights are published. Offline tutor turns are not
queued.
