# ADR 006: Direct AI Streaming

## Status

Accepted

## Context

The live tutor and feedback loops need low-latency responses and a clear interactive experience.

## Decision

Stream live AI responses directly through the authenticated API boundary; reserve the worker for heavy async jobs.

## Consequences

- Better perceived latency for tutor interactions
- A narrower boundary for live response safety and usage tracking
- Heavy jobs still belong in async worker paths
