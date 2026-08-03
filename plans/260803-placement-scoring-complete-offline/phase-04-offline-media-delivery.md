---
phase: 4
title: "Offline media delivery"
status: in-progress
priority: P1
effort: "2d"
dependencies: [2, 3]
---

# Phase 4: Offline media delivery

## Overview

Add versioned, checksum-verified offline media cache for published listening
assets on web and Expo, with explicit download/remove UI and safe quota/error
states.

## External release gate

The governed Japanese source marks listening audio as `planned`; no reviewed
recorded MP3, delivery URL, size, SHA-256, or publishable release manifest is
in this repository. Do not introduce placeholder media. Manifest generation,
account/release caches, and web/Expo download/playback/remove controls now exist
and render a truthful unavailable state. A learner-visible audio release and
runtime playback proof still require the approved input.

## Implementation Steps

1. Define shared media manifest/cache contracts and publish a static media
   manifest from governed content metadata without exposing private storage keys.
2. Implement Expo FileSystem cache with content-release namespace, checksum,
   atomic temp-to-final promotion, quota, cancellation, logout wipe, and tests.
3. Implement browser Cache Storage adapter plus service worker download/evict
   commands where supported.
4. Add accessible lesson controls for download availability/progress/removal;
   existing online learning behavior remains unchanged when no audio is present.

## Success Criteria

- [ ] Corrupt/stale media is never marked available offline.
- [ ] Cached content is removed on account/logout policy and does not cross
  namespaces.
