# ADR 007: Canonical API Host

## Status

Accepted

## Context

The platform needs one versioned API host that web, mobile, and future admin surfaces can rely on.

## Decision

Use the Next.js app as the canonical host for `/api/v1`.

## Consequences

- Route ownership stays centralized
- Shared versioned contracts are easier to document
- Web and mobile can consume the same endpoint surface consistently
