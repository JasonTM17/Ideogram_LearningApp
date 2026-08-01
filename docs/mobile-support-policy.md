# Mobile Support Policy

## Current policy

| Item                   | Policy                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| Expo SDK 57 floor      | Android 7+ and iOS 16.4+ per the [official SDK reference](https://docs.expo.dev/versions/latest/) |
| Product beta target    | Android 10+ and iOS 17+; this target is planning data, not yet enforced by release config         |
| Runtime version policy | `appVersion`                                                                                      |
| Release support window | Proposed: current binary and N-1 binary for 90 days; no released binary or EAS pipeline exists    |

## Current evidence in repo

- `apps/mobile/package.json` pins Expo `~57.0.8`, React Native `0.86.0`, and app version `0.1.0`.
- `apps/mobile/app.json` is still a static Expo foundation app with no EAS config.
- The current mobile app is still a foundation screen, not a released learning flow.

## Native learning operation boundary

- Native activity mutations use an Expo SecureStore-backed identity store plus a
  document-directory installation sentinel.
- The store creates one UUID device identity and reserves a monotonic sequence
  before an operation is sent; failed persistence never returns the reservation.
- The keychain item is device-only and is not a user credential. If the
  installation sentinel is absent (including after an iOS reinstall), the old
  keychain value is deleted before a new operation stream is created.
- The identity is used for idempotency/replay only, not for learner
  authorization. Reservations are serialized within one JavaScript runtime;
  background/headless mutation workers need a transactional counter before they
  can reserve independently.
- This slice does not provide an offline queue, retry scheduler, or conflict
  reconciliation. Those behaviors belong to the later mutation-queue phase and
  must keep the server evaluator as the source of truth.
- A fresh installation is treated as a new operation stream. Android and iOS
  uninstall/reinstall checks remain a release validation gate for the native
  binary and its document storage behavior.

## Pre-release enforcement work

- Add an explicit device/runtime gate before claiming that devices below the
  product beta target fail closed; the current app does not enforce it.
- Use separate validation for Android and iOS before widening support.
- Treat the N-1/90-day window as a proposal until a released binary and
  validated device matrix exist.

## Release notes for the future

- Any change to the support floor should be recorded here before shipping.
- Any device-class exclusion should be explicit, not implied.

## Open questions

- Exact device-validation matrix for the first public beta
- Whether the N-1 support window should vary by platform or store policy
