# External Dependency Matrix

## Status

This repository has dependency references and local config, but no production external accounts are provisioned or claimed here.

## Matrix

| Dependency           | Purpose                           | Current state                                              | Required by               |
| -------------------- | --------------------------------- | ---------------------------------------------------------- | ------------------------- |
| DeepSeek API         | Server-only AI provider           | Contracted in env example, not stored as a secret here     | AI tutor and grading work |
| Supabase             | Auth, Postgres, storage, RLS      | Local workflow documented, deployment not provisioned here | Identity, data, storage   |
| Expo / EAS           | Mobile build and release pipeline | App config present, release not provisioned here           | Mobile delivery           |
| Apple Developer      | iOS signing and store release     | Not provisioned here                                       | iOS release               |
| Google Play Console  | Android signing and store release | Not provisioned here                                       | Android release           |
| Domains / DNS        | Public web/app routing            | Not provisioned here                                       | Production launch         |
| Monitoring           | Logs, alerts, traces              | Not provisioned here                                       | Launch operations         |
| Email / OTP provider | Sign-in and lifecycle messaging   | Not provisioned here                                       | Auth flows                |

## Notes

- The DeepSeek credential is server-only and must never be copied into client env files.
- The repo should treat all live account values as external to source control.
- Local Supabase auth now covers invite-only email OTP, callback exchange, and local sign-out, but production mail provider configuration and redirect allowlists still need separate provisioning.
- This matrix is planning data, not proof of operational readiness.

## Open questions

- Who owns each paid account and secret rotation process
- Which providers are approved for launch versus later phases
