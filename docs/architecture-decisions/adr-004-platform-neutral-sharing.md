# ADR 004: Platform-Neutral Shared Packages

## Status

Accepted

## Context

Web and mobile need to share logic without sharing DOM or native shells.

## Decision

Share only platform-neutral packages: contracts, tokens, validators, helpers, and tests.

## Consequences

- Lower duplication in the important parts of the system
- Less risk of platform API leakage
- UI shells remain free to diverge where the platform requires it
