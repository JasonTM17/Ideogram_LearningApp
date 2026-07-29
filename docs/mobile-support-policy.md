# Mobile Support Policy

## Current policy

| Item                   | Policy                                                                  |
| ---------------------- | ----------------------------------------------------------------------- |
| Expo platform floor    | Android 7+ and iOS 16.4+ per current Expo docs                          |
| Product beta target    | Android 10+ and iOS 17+                                                 |
| Runtime version policy | `appVersion`                                                            |
| Release support window | Current binary and N-1 binary for 90 days, subject to device validation |

## Current evidence in repo

- `apps/mobile/app.json` sets `runtimeVersion.policy` to `appVersion`.
- `apps/mobile/package.json` defines the Expo app shell.
- The current mobile app is still a foundation screen, not a released learning flow.

## Support rules

- Fail closed if a device falls below the beta support target.
- Use separate validation for Android and iOS before widening support.
- Do not promise support beyond the current binary and N-1 window without a validated device matrix.

## Release notes for the future

- Any change to the support floor should be recorded here before shipping.
- Any device-class exclusion should be explicit, not implied.

## Open questions

- Exact device-validation matrix for the first public beta
- Whether the N-1 support window should vary by platform or store policy
