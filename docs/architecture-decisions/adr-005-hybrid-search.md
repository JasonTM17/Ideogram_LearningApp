# ADR 005: Hybrid Search

## Status

Accepted

## Context

The platform will need search across lessons, notes, and learner-generated state as the corpus grows.

## Decision

Use a future hybrid of Postgres full-text search and pgvector for semantic retrieval.

## Consequences

- Structured search stays inside the primary data plane
- Semantic retrieval can grow without a separate search cluster too early
- Search behavior must be tested as part of product quality, not assumed
