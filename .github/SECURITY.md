# Security Policy

## Supported scope

Security fixes are accepted for the current `main` branch. This repository is
an internal-beta reference implementation and does not currently claim a
hosted production service or production SLA.

## Reporting a vulnerability

Use GitHub's **Report a vulnerability** flow on the repository Security tab.
Do not open a public issue for suspected credential exposure, authentication
bypass, cross-account data access, injection, or supply-chain compromise.

Include:

- affected commit and component;
- reproduction steps with secrets and personal data removed;
- expected and observed behavior;
- impact and any safe mitigation already tested.

The maintainer will acknowledge a complete report when available, validate the
impact, and coordinate disclosure after a fix. No response-time guarantee is
made before a public production service exists.

## Security boundaries

- Never commit `.env` files, tokens, passwords, service-role keys, private
  database URLs, learner data, or provider prompts containing personal data.
- Use synthetic accounts and content for reproduction.
- Content rights issues belong in the content-rights ledger, not in security
  reports.
