---
phase: 1
title: Contract and Policy
status: completed
effort: small
---

# Phase 1: Contract and Policy

## Overview

Extend the strict shared tutor contract with a typed receipt and provider usage
metadata. Add an explicit kill switch, consent policy key, bounded pricing inputs,
and level-pair validation so the route can fail closed before any provider request.

## Implementation Steps

- Extend `packages/contracts/src/ai/tutor-contract.ts` with validated usage, receipt,
  and optional source-boundary metadata. Validate `targetLevelCode` against the
  selected language pack, not merely a string length.
- Extend `packages/ai/src/deepseek-tutor-gateway.ts` to return structured response +
  usage, pass the authenticated DeepSeek `user_id` when supplied, and reject malformed
  or unbounded provider payloads without exposing provider text.
- Add cost estimation and configuration validation in `packages/ai`, including the
  explicit `AI_TUTOR_ENABLED` gate and configurable input/output micro-USD prices.
- Update unit tests for contract parsing, usage parsing, abort behavior, configuration,
  and provider request shape. Do not add or read a real key in source control.

## Success Criteria

- [ ] Request rejects unknown keys and invalid language/level pairs.
- [ ] Provider result requires bounded structured tutor response and token usage.
- [ ] Disabled or incomplete AI policy/configuration fails before fetch.
- [ ] Price math is integer micro-USD and covered by unit tests.
