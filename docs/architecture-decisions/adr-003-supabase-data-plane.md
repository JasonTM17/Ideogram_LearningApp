# ADR 003: Supabase Data Plane

## Status

Accepted

## Context

The product needs auth, Postgres, storage, and row-level security without building a separate backend platform first.

## Decision

Use Supabase as the data plane for auth, Postgres, storage, and RLS.

## Consequences

- RLS becomes a first-class security boundary
- Private storage and typed contracts stay centralized
- Production operations depend on Supabase account and policy setup
