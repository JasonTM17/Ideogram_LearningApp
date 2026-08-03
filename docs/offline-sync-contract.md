# Offline Sync Contract

## Delivered boundary

`@ideogram/sync` owns a platform-neutral durable queue. Web adapts its storage
port to IndexedDB; Expo adapts it to SecureStore. Both queue retryable activity,
review, placement-answer, and placement-submit writes. Each record keeps the validated original
body, idempotency key, operation ID, creation time, retry count, and a
`(userId, sessionEpoch)` namespace.

## Invariants

- At most 50 mutations and 256 KiB of UTF-8 serialized data are retained per
  active namespace. A mutation can retry at most 20 times before becoming
  blocked for an explicit retry or discard decision.
- A record is removed only after its HTTP route returns a valid receipt.
- Drain is sequential. Retryable transport/server ambiguity stays pending;
  terminal auth/validation/conflict outcomes become blocked for user action.
- Restoring storage under another user or session epoch clears it before any
  network replay. The client never calculates SRS or placement scores locally.

## UX and limits

Web shows a Vietnamese pending-sync card with a foreground “Đồng bộ ngay”
action and registers a service worker / Background Sync when the browser
supports it. Expo registers an OS-scheduled BackgroundTask when available; its
task uses the same receipt-gated drain and caps one wake at five mutations.
A queued write is never shown as server-complete. Browser and real-device
execution remain validation work, because background scheduling is best-effort.
Approved listening media has a separate checksum-bound web/Expo cache contract;
the current governed manifest intentionally remains unavailable until a reviewed
recording and redistribution rights are published. Offline tutor turns are not
queued.
