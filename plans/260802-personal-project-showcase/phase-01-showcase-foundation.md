---
phase: 1
title: Showcase Foundation
status: completed
priority: P1
effort: 1d
dependencies: []
---

# Phase 1: Showcase Foundation

## Overview

Create a public project-tour route that turns the real beta implementation into
an easy-to-evaluate personal-project demo. It must be static and independent of
the authenticated catalog/database path.

## Requirements

- Add a linked `/showcase` route under `apps/web/src/app`.
- Explain the implemented web/mobile/AI/activity boundaries with specific,
  non-marketing language.
- Link to source documentation and the actual authenticated learning entry point.
- Maintain visible focus, skip navigation, readable mobile layout, and reduced
  motion support.

## Related Code Files

- Create: `apps/web/src/app/showcase/page.tsx`
- Create: `apps/web/src/app/showcase/page.test.tsx`
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/styles/public-site.css`

## Implementation Steps

1. Add a semantic, static product-tour page with a concise project brief,
   implemented capability timeline, demo route, visual media, and honest scope.
2. Add an explicit public-site link to the tour from the header, hero, and footer.
3. Add a focused component test for the route's essential headings, links, and
   non-credentialed demo contract.

## Implementation Steps

<!-- Detailed steps -->

## Success Criteria

- [ ] A reviewer can reach `/showcase` directly and understand the project
  without signing in.
- [ ] The page makes no claim that planned AI, admin, offline, or production
  features are already delivered.
- [ ] The public landing page exposes the tour through a clear CTA.

## Risk Assessment

Static media can become stale. Link back to source docs and keep wording aligned
with `README.md` rather than duplicating product contracts.
