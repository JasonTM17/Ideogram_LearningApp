# Ideogram Learning — Design System

> Version 0.2 · 2026-07-29  
> Working product name only.  
> Stitch project: `projects/11429302359379765748`.  
> Stitch design system: `assets/3415345924425844809` (version 2).

When building a page, read this file first, then check
`design-system/ideogram-learning/pages/<page-name>.md`. A page file overrides
only the rules it explicitly replaces.

## Creative direction

**Direction:** Editorial Scholar.

The product should feel like a calm, credible study workspace for Vietnamese
adults. It combines editorial reading quality with the clarity of a focused
productivity tool. Progress is visible because it guides the next learning
decision, not because it creates noise.

Keywords for design and generation:

`editorial`, `calm`, `multilingual`, `Vietnamese-first`, `adult learning`,
`content-first`, `study mode`, `spaced repetition`, `audio practice`,
`paper-like surfaces`, `soft indigo and teal`, `accessible`, `CJK-safe`,
`light and dark themes`, `native mobile`.

## Product principles

1. One primary learning action per screen.
2. Explanation and recall take priority over decorative progress.
3. AI responses remain visually distinct from verified curriculum content.
4. Vietnamese copy is plain, respectful, and specific.
5. Web and native mobile share tokens and hierarchy, not page implementations.
6. Every asynchronous or network-dependent view has loading, empty, error, and
   offline states.
7. Japanese, Chinese, and Korean use neutral labels and script samples; never
   use flags to represent languages.

## Color tokens

Use semantic tokens in implementation. Raw values are reference values, not
component-level API.

### Light

| Token | Value | Use |
|---|---:|---|
| `canvas` | `#F8FAFC` | App background |
| `surface` | `#FFFFFF` | Reading and task surfaces |
| `surface-subtle` | `#EEF2FF` | Selected context and quiet grouping |
| `surface-raised` | `#FFFFFF` | Sheet, menu, dialog |
| `text-primary` | `#0F172A` | Main text |
| `text-secondary` | `#475569` | Supporting text |
| `text-tertiary` | `#64748B` | Metadata with verified contrast |
| `border-subtle` | `#CBD5E1` | Dividers and input borders |
| `action-primary` | `#1E40AF` | Primary action and active navigation |
| `on-action-primary` | `#FFFFFF` | Text/icon on primary |
| `action-secondary` | `#0F766E` | Secondary action and AI context |
| `accent-warm` | `#C2410C` | Sparse emphasis; never body text on white |
| `success` | `#15803D` | Confirmed success/mastery |
| `warning` | `#B45309` | Attention/review due |
| `danger` | `#B91C1C` | Errors/destructive actions |
| `focus-ring` | `#2563EB` | Keyboard and accessibility focus |

### Dark

| Token | Value | Use |
|---|---:|---|
| `canvas` | `#0B1220` | App background |
| `surface` | `#111827` | Reading and task surfaces |
| `surface-subtle` | `#1F2937` | Selected context and quiet grouping |
| `surface-raised` | `#243044` | Sheet, menu, dialog |
| `text-primary` | `#F1F5F9` | Main text |
| `text-secondary` | `#CBD5E1` | Supporting text |
| `text-tertiary` | `#94A3B8` | Metadata |
| `border-subtle` | `#475569` | Dividers and input borders |
| `action-primary` | `#60A5FA` | Primary action and active navigation |
| `on-action-primary` | `#0B1220` | Text/icon on primary |
| `action-secondary` | `#2DD4BF` | Secondary action and AI context |
| `accent-warm` | `#F59E0B` | Sparse emphasis |
| `success` | `#4ADE80` | Confirmed success/mastery |
| `warning` | `#FBBF24` | Attention/review due |
| `danger` | `#F87171` | Errors/destructive actions |
| `focus-ring` | `#93C5FD` | Keyboard and accessibility focus |

All production pairs must be checked at rendered size. Normal text needs 4.5:1;
large text and meaningful UI graphics need 3:1. Color never carries meaning
without text, shape, or icon.

## Typography

### Families

- UI and Vietnamese: `"Be Vietnam Pro", "Noto Sans", system-ui, sans-serif`.
- Japanese content: `"Noto Sans JP", "Noto Sans", sans-serif`.
- Simplified Chinese content: `"Noto Sans SC", "Noto Sans", sans-serif`.
- Korean content: `"Noto Sans KR", "Noto Sans", sans-serif`.
- Data/code only: `"Noto Sans Mono", ui-monospace, monospace`.

Apply locale families with `lang` metadata. Do not load every CJK family on
every route; load the active language pack. Mobile may use platform CJK
fallbacks when they preserve metrics and glyph quality.

### Scale

| Token | Size / line height | Weight |
|---|---|---:|
| `display` | `32 / 42` | 700 |
| `heading-lg` | `24 / 34` | 650 |
| `heading-md` | `20 / 30` | 600 |
| `body-lg` | `18 / 30` | 400 |
| `body` | `16 / 26` | 400 |
| `body-sm` | `14 / 22` | 400 |
| `label` | `14 / 20` | 600 |
| `caption` | `12 / 18` | 500 |

Target-language sentences use a 1.65–1.75 line-height. Do not justify CJK text.
Support ruby/furigana without collapsing line boxes. Respect browser zoom and
native font scaling up to 200%.

## Layout and spacing

- Base spacing unit: 4; preferred rhythm: 8, 12, 16, 24, 32, 48.
- Phone gutters: 16–20; tablet: 24; desktop: 32.
- Desktop reading column: 680–760px.
- Desktop sidebar: 264px; tablet navigation rail: 72px.
- Surface radius: 12px; control radius: 10px; compact chip radius: 999px.
- Shadows are reserved for menus, sheets, and dialogs:
  `0 8px 24px rgb(15 23 42 / 0.10)`.
- Cards use tonal surfaces and borders before shadows.
- Breakpoints to verify: 320, 375, 768, 1024, and 1440px.

## Navigation

Top-level destinations are fixed:

1. Hôm nay
2. Ôn tập
3. Trợ lý
4. Tiến độ
5. Bạn

Desktop uses one sidebar. Mobile uses one labelled bottom tab bar. Lesson and
review task flows temporarily hide top-level navigation and preserve predictable
system back behavior. Never mix sidebar and bottom navigation at the same
hierarchy level.

## Component rules

- Buttons: primary, secondary, ghost, and destructive; minimum 44pt iOS /
  48dp Android; async state prevents double submit while keeping a readable
  label.
- Inputs: visible label, helper/error text, 16px minimum input text, validation
  after blur, visible focus.
- Lesson block: clearly identifies verified curriculum, target language, skill,
  and activity position.
- Review card: one recall decision at a time; no swipe-only required action.
- Audio control: play/pause, replay, speed, transcript, elapsed state, and
  permission/error messaging. Never autoplay.
- AI response: marked as AI, shows context/source boundary, uncertainty and
  retry; actions include save to review or inspect the related lesson.
- Progress: insight plus next action. Charts have a text summary and accessible
  data alternative.
- Banner/toast: announces status without stealing focus; errors always offer a
  recovery path.

Every interactive component supports default, hover where relevant,
focus-visible, pressed, selected, disabled, loading, error, and success states.

## Motion

- Feedback appears within 100ms.
- Micro-interactions last 150–300ms; exits are shorter than entrances.
- Animate opacity and transform, not layout dimensions.
- Motion communicates navigation or state change; no confetti, parallax, or
  decorative infinite animation.
- Reduced-motion mode removes spatial motion without hiding state changes.

## Accessibility

- WCAG 2.2 AA target for web; equivalent VoiceOver/TalkBack semantics on mobile.
- Logical focus/read order, skip link on web, route-change focus management.
- Vector icons from one outline family, with labels for icon-only controls.
- Touch targets and safe areas are mandatory on both platforms.
- Dynamic Type/font scale, landscape, keyboard navigation, and screen readers
  are release checks.
- Audio includes transcript; microphone use requires rationale, consent,
  recording indicator, stop, playback, and delete.

## Platform boundaries

Share:

- design tokens, copy taxonomy, icon names, validation, component state models,
  analytics events, and deep-link contracts.

Implement separately:

- web sidebar and native tab bar;
- DOM dialogs and platform sheets;
- web audio element and native media recorder/player;
- desktop tables/charts and mobile drill-down summaries;
- page and screen shells.

## Stitch generation contract

Each prompt must state:

- adult Vietnamese learner and active language pack;
- one primary task;
- exact desktop or mobile device class;
- Editorial Scholar direction and this token system;
- real Vietnamese plus Japanese/Chinese/Korean sample content;
- loading, empty, error, and offline behavior;
- platform navigation, safe areas, focus/accessibility, and reduced motion;
- no mascot, flags, emoji icons, childish fonts, neumorphism, glass-heavy
  surfaces, or gamification clutter.

Required first-pass frames:

- Mobile: Hôm nay, review card, AI tutor, progress, Bạn.
- Desktop: Hôm nay, lesson, review queue, AI tutor, progress.

## Anti-patterns

- No country flags for language selection.
- No mascot-first identity or copied competitor patterns.
- No newsletter landing-page pattern inside the authenticated product.
- No Baloo, Comic Neue, handwritten display font, or neon body copy.
- No hover-only action, swipe-only action, hidden labels, or focus removal.
- No dense card wall, random gradients, oversized progress rings, or fake data
  presented as real learner history.
- No direct HTML-to-native screen conversion.
