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
