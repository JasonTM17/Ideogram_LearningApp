# ADR 002: Expo Native Mobile

## Status

Accepted

## Context

The mobile product must ship as a real native app while sharing as much domain logic and contract surface as possible with the web stack.

## Decision

Use Expo / React Native for the mobile runtime.

## Consequences

- Native Android and iOS delivery stays in one TypeScript workspace
- Shared contracts and tokens remain practical
- The mobile shell stays distinct from the web shell
