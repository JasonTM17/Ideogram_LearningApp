# Offline Sync Recovery

## Symptoms

- Web queued writes do not drain after reconnect
- Native queued writes remain pending after sign-in or app resume
- The browser service worker never registers the background sync tag
- The Expo background task registration returns unavailable or never fires
- A queue suddenly looks empty after a user switch or session epoch change

## Safe checks

1. Confirm the user is authenticated and the current session is still valid.
2. Confirm the queue namespace matches the current `userId` and `sessionEpoch`.
3. For web, confirm `navigator.serviceWorker` exists and the app can reach `/offline-sync-service-worker.js`.
4. For native, confirm `expo-background-task` reports `Available`.
5. Confirm the pending mutation is still valid for the current account and content state.
6. Confirm the underlying API route returns a receipt when retried manually in the app.

## Recovery

- Bring the client online and use the in-app sync action first.
- For web, reload the app so IndexedDB state and the service worker re-register cleanly.
- For native, foreground the app with a valid session so the SecureStore-backed queue can drain.
- If the account changed, sign out and sign back in so the namespace can reset safely.
- If the mutation is blocked by a validation or content error, fix the underlying request instead of deleting the queue.

## Guardrails

- Do not delete pending queue storage just to make the pending count look clean.
- Do not treat browser Background Sync or Expo BackgroundTask registration as proof of a successful retry.
- Do not claim offline tutor queues exist. Media cache source exists, but no
  approved recorded asset or browser/device media run is available as proof.

## Related docs

- [Offline sync contract](../offline-sync-contract.md)
- [Review and sync contract](../review-and-sync-contract.md)
- [Release validation evidence](../release/validation-evidence.md)
