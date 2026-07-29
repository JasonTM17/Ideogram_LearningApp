# Ideogram Learning Design System

> Source of truth for web and native implementation. A page-specific file in
> `pages/` may refine these rules, but may not weaken accessibility, privacy, or
> platform conventions.

## Product character

Ideogram Learning helps Vietnamese adults make steady progress in Japanese,
Chinese, and Korean. The visual language is paper-light, editorial, calm, and
content-first. It should feel focused and encouraging rather than childish,
gamified, or like a dense enterprise dashboard.

- One primary learning action per screen.
- Progress explains the next useful decision; it is never decorative noise.
- AI is an evidence-aware coach. Show source, uncertainty, and recovery states.
- Use real Vietnamese and CJK examples; do not use emoji as structural icons.

## Semantic tokens

| Family | Light | Dark | Purpose |
|---|---:|---:|---|
| `canvas` | `#F8FAFC` | `#0B1220` | application background |
| `surface` | `#FFFFFF` | `#111827` | reading and card surface |
| `surface-subtle` | `#EEF2FF` | `#1F2937` | selected context and quiet grouping |
| `surface-raised` | `#FFFFFF` | `#172033` | menu, sheet, dialog |
| `border-subtle` | `#E2E8F0` | `#334155` | quiet separation |
| `text-primary` | `#0F172A` | `#F1F5F9` | primary reading text |
| `text-secondary` | `#475569` | `#CBD5E1` | supporting text |
| `text-tertiary` | `#64748B` | `#94A3B8` | metadata with verified contrast |
| `action-primary` | `#1E40AF` | `#60A5FA` | start, submit, selected |
| `on-action-primary` | `#FFFFFF` | `#0B1220` | text and icons on primary action |
| `action-secondary` | `#0F766E` | `#2DD4BF` | contextual learning action |
| `accent-warm` | `#C2410C` | `#F59E0B` | restrained attention and CTA |
| `success` | `#15803D` | `#4ADE80` | confirmed success or mastery |
| `warning` | `#B45309` | `#FBBF24` | review due or attention needed |
| `focus-ring` | `#2563EB` | `#93C5FD` | visible keyboard focus |
| `danger` | `#B91C1C` | `#FCA5A5` | destructive action with text/icon |

Use semantic names in components, not raw hex values. Every text pair must meet
WCAG AA (4.5:1 for normal text, 3:1 for large text and UI glyphs). Dark mode is
a designed palette, not an inversion.

## Type and content

- UI Vietnamese: `Be Vietnam Pro`, fallback `Noto Sans`.
- Learning text: `Noto Sans JP`, `Noto Sans SC`, or `Noto Sans KR` per language
  pack, with the normal system fallback stack.
- Load only the active CJK language family on a route. Apply it through `lang`
  metadata; never force every CJK family into the initial bundle.

| Token | Size / line height | Weight | Use |
|---|---|---:|---|
| `display` | `32 / 42` | 700 | one page-level statement |
| `heading-lg` | `24 / 34` | 650 | lesson or task heading |
| `heading-md` | `20 / 30` | 600 | section heading |
| `body-lg` | `18 / 30` | 400 | key instruction |
| `body` | `16 / 26` | 400 | normal learning copy and inputs |
| `body-sm` | `14 / 22` | 400 | support copy |
| `label` | `14 / 20` | 600 | controls and metadata label |
| `caption` | `12 / 18` | 500 | quiet metadata |

Body and inputs are at least 16px. CJK learning text uses a 1.65–1.75
line-height, natural wrapping, and no justification. Support ruby/furigana
without collapsing the line box. Dynamic Type/font scale must work to 200%
without hiding essential content.

## Layout and navigation

| Viewport | Navigation | Content rule |
|---|---|---|
| 320–767 | labelled five-item bottom tab | one-column, 16–20px gutter, task flow hides tab bar |
| 768–1023 | compact rail + contextual sheet | prioritize lesson content and transcript |
| >=1024 | 248–280px sidebar | main lesson measure max 760px; secondary context in a side panel |

Use a 4/8pt spacing scale. Preferred rhythm: 8, 12, 16, 24, 32, and 48.
Reserve space for fixed navigation and native safe areas. Use a 12px surface
radius, 10px control radius, and 999px compact-chip radius. Cards favour tonal
surfaces and borders before shadows; reserve `0 8px 24px rgb(15 23 42 / 0.10)`
for menus, sheets, and dialogs. Verify 320, 375, 768, 1024, and 1440px. Do not
create horizontal scrolling or put a desktop dashboard unchanged inside a phone
layout.

Top-level destinations are fixed:

1. Hôm nay
2. Ôn tập
3. Trợ lý
4. Tiến độ
5. Bạn

## Components and states

Build app bar, side/bottom navigation, buttons, forms, lesson blocks, review
cards, audio/transcript controls, AI responses, progress indicators, sheets,
dialogs, banners, and skeletons from the shared token system.

- Every interactive component has default, hover (web), focus-visible, pressed,
  selected, disabled, loading, error, and success states where applicable.
- Keep touch targets >=44x44pt on iOS and >=48x48dp on Android, with >=8px gap.
- Use Lucide-outline semantics on web and an equivalent native vector icon map.
- Loading over 300ms uses a skeleton or progress indication; errors name a
  recovery action; destructive actions require confirmation.
- Motion uses opacity/transform for 150–300ms, has a meaningful cause, and
  respects reduced motion. Never use autoplay decoration, confetti, mascots,
  or streak mechanics as a primary visual device.

Component-specific requirements:

- Buttons include primary, secondary, ghost, and destructive variants; async
  states prevent double submit while leaving a readable label.
- Inputs have a visible label, helper/error text, validation after blur, and a
  visible focus state.
- Lesson blocks state verified curriculum, target language, skill, and activity
  position. Review cards present one recall decision at a time; no swipe-only
  required action.
- Audio includes play/pause, replay, speed, transcript, elapsed state, and
  permission/error messaging. It never autoplays.
- Progress combines a useful insight with the next action; charts have a text
  summary and accessible data alternative.
- Banners/toasts announce status without stealing focus, and every error offers
  a recovery path.

## Accessibility and trust gates

- Web uses semantic landmarks, a skip link, visible 2–4px focus, predictable
  focus management, keyboard equivalents, and explicit labels for icon buttons.
- Native uses platform controls, safe areas, accessibility roles/labels/hints,
  and predictable system back gestures.
- Never communicate state with color alone. Provide text/icon support, live
  announcements for errors, captions/transcripts for audio, and explicit mic
  consent with stop/delete controls.
- AI output must distinguish facts/rubrics from suggestions, cite its learning
  context when available, and give a safe retry/fallback state.

## Platform boundaries

Share design tokens, copy taxonomy, icon names, validation, component-state
models, analytics events, and deep-link contracts. Implement DOM dialogs and
native sheets, web audio and native recording/player controls, desktop data
views and mobile drill-down summaries, plus the page/screen shells separately.

## Anti-patterns

- Do not use country flags for language selection, mascot-first identity, or
  copied competitor patterns.
- Do not put newsletter-landing-page conventions inside the authenticated app.
- Do not use childish display fonts, neon body copy, glass-heavy surfaces,
  hover-only actions, swipe-only required actions, hidden labels, or removed
  focus rings.
- Do not present fake learner history as real data or copy Stitch HTML directly
  into a native screen.

## Stitch handoff rules

Stitch HTML is a visual reference only; it is never copied directly into Next.js
or Expo. Rebuild each screen with these tokens, semantic structure, responsive
rules, and platform-native navigation.

For every planned screen, include the main task plus loading, empty, error,
offline, focus/accessibility, and reduced-motion behavior. Exported reference:
[`plans/260729-1500-jck-ai-learning-platform/designs/dashboard-today/`](../../plans/260729-1500-jck-ai-learning-platform/designs/dashboard-today/).
