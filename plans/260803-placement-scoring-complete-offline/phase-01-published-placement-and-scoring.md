---
phase: 1
title: Published placement and scoring
status: completed
priority: P1
effort: 2d
dependencies: []
---

# Phase 1: Published placement and scoring

## Overview

Seed a reviewed Japanese N5 placement bank and add deterministic worker scoring
over private rubric data. Learner HTTP routes remain answer-safe and return a
scored receipt after polling/refetching the existing session status.

## Implementation Steps

1. Audit release/provenance constraints; add an idempotent migration that
   inserts one published Japanese N5 set with bounded public prompts and private
   rubrics, tied to existing governed release/provenance rows.
2. Create pure rubric evaluation and level recommendation modules, with golden
   tests for score, confidence, unknown rubric, and malformed data.
3. Add a worker DB adapter that claims submitted sessions safely, reads private
   scoring input only as `service_role`, scores idempotently, and writes through
   `private.score_placement_session`.
4. Add a minimal polling/retry operational entry point and route/repository
   tests that prove no rubric or answer key leaks.

## Success Criteria

- [x] Fresh reset contains one published answer-safe placement bank.
- [x] Worker scores each submitted session once and safe-replays a match.
- [x] Scored level/confidence is visible only through the public receipt.
