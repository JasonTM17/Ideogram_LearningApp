# ADR 001: Modular Monolith Workspace

## Status

Accepted

## Context

The platform needs web, mobile, worker, contracts, and shared support packages without early microservice overhead.

## Decision

Use a modular monolith TypeScript workspace with separate app runtimes and shared platform-neutral packages.

## Consequences

- Faster initial delivery than a service fleet
- Clearer boundary enforcement inside one repo
- Easier sharing of contracts, validators, and tokens
- Still requires discipline to avoid leaking platform-specific UI into shared code
