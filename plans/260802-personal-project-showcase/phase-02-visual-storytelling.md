---
phase: 2
title: Visual Storytelling
status: completed
priority: P1
effort: 0.5d
dependencies:
  - 1
---

# Phase 2: Visual Storytelling

## Overview

Make the existing architecture and mobile-flow evidence suitable for a portfolio
review while preventing target-state visuals from being mistaken for a current
implementation map.

## Requirements

- Update the semantic Mermaid architecture source, regenerated SVG/PNG, and
  public copy to label current versus target components.
- Reuse checked-in mobile design flow assets; do not imply the GIF is a runtime
  recording if it is a design handoff sequence.
- Preserve local, versioned visual sources and reproducible regeneration steps.

## Related Code Files

- Modify: `docs/diagrams/system-architecture.mmd`
- Modify: `docs/media/system-architecture.svg`
- Modify: `docs/media/system-architecture.png`
- Modify: `docs/media/README.md`
- Modify: `apps/web/src/app/showcase/page.tsx`

## Implementation Steps

1. Categorize diagram nodes and connectors as implemented or target-state.
2. Regenerate the checked-in SVG and PNG from Mermaid source.
3. Present both visual artifacts in the showcase with accessible captions.

## Implementation Steps

<!-- Detailed steps -->

## Success Criteria

- [ ] A reviewer can tell exactly which architecture components run today.
- [ ] Architecture assets are regenerated from their checked-in source.
- [ ] The tour describes the animated mobile artifact accurately.

## Risk Assessment

Mermaid rendering can change across CLI versions. Retain the source and document
the exact regeneration command/output dimensions.
