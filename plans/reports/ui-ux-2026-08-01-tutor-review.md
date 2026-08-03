# UI/UX review — AI tutor preference and response surfaces

Date: 2026-08-01  
Scope: `apps/web/src/features/ai/tutor-preference-draft.tsx`,
`tutor-preference-controls.tsx`, `tutor-response-panel.tsx`,
`apps/mobile/src/features/assistant/assistant-screen.tsx`,
`tutor-preference-draft-panel.tsx`, `tutor-response-card.tsx`,
`docs/design-guidelines.md`, and `design-system/ideogram-learning/MASTER.md`.

Review lens: Vietnamese-first content, WCAG/native accessibility, form states,
mobile ergonomics, semantic tokens, and the bounded-form AI tutor direction.
The current implementation is a valid bounded-form slice (the design doc says
streaming, SRS save, and history are later); findings below focus on the slice
that exists.

## High priority

### 1. New responses are not announced or focused for assistive technology

- Web: `apps/web/src/features/ai/tutor-response-panel.tsx:21-38` inserts the
  response after submit but has no `aria-live`, `role="status"`, or focus move.
  `aria-label` on the section does not announce a dynamic result reliably.
- Native: `apps/mobile/src/features/assistant/tutor-response-card.tsx:27-48`
  gives a `View` an `accessibilityLabel`, but no `accessible`,
  `accessibilityLiveRegion`, heading semantics, or focus handoff.

Impact: a VoiceOver/TalkBack user can submit successfully and receive no signal
that six new sections are available; the next focus remains on the composer.

Recommendation: announce the ready state politely (not assertively), expose the
heading as the accessible name, and move focus/announce to the response summary
after a successful request. Keep the full response navigable section by section.

### 2. Web allows editing the question while the request is in flight

`apps/web/src/features/ai/tutor-preference-draft.tsx:117-130` does not disable
the textarea during `submitting`; only the preference fieldset is disabled.
The request captures `trimmedMessage`, so a user can replace the visible draft
while the server answers the previous one. The ready response then appears next
to a different question, and clearing the field can leave the retry button
disabled.

Recommendation: disable the textarea (or snapshot and render the submitted
question beside the response), then restore editing after the request settles.
Clear or version the response when the draft changes.

### 3. Auth/permission failures have no recovery action

- Web error copy `apps/web/src/features/ai/tutor-preference-draft.tsx:20-29`
  maps `UNAUTHORIZED` and `FORBIDDEN` to text, but the only action at
  `:150-156` is a generic “Thử lại”. Retry cannot sign in or accept the AI
  policy.
- Native `apps/mobile/src/features/assistant/assistant-screen.tsx:134-139`
  renders “Cần đăng nhập” with no action. The composer remains visible and
  appears usable while the send control is disabled.

Recommendation: use contextual actions (`Đăng nhập`, `Xem/chấp thuận chính
sách`, `Thử lại`) and either hide or explicitly disable the composer while the
session is absent. Preserve a draft when redirecting to sign-in.

### 4. Mobile puts the primary question below five full preference groups

`apps/mobile/src/features/assistant/assistant-screen.tsx:141-149` renders the
preference panel before the composer, and
`apps/mobile/src/features/assistant/tutor-preference-draft-panel.tsx:75-114`
always expands language, level, objective, depth, and tone. At 320–375px the
primary task and send button are pushed far below the fold, contrary to the
mobile one-column/primary-action guidance. The Stitch mobile reference keeps
the question/chat surface primary and treats context as compact secondary UI.

Recommendation: keep a compact summary (“Tiếng Nhật · N5 · Giao tiếp”) above
the composer and move the five groups into a disclosure or native bottom sheet.
Default the disclosure closed after the first request.

### 5. Web tutor surfaces bypass semantic tokens and do not have dark variants

The web files use hard-coded Tailwind colors/radii/shadows (`bg-white`,
`bg-stone-*`, `text-stone-*`, `bg-orange-*`, `rounded-2xl/3xl`, `shadow-sm`)
at `tutor-preference-draft.tsx:94-158`,
`tutor-preference-controls.tsx:55-131`, and
`tutor-response-panel.tsx:21-36`. The app declares a dark palette, but these
classes do not switch, leaving light “islands” in dark mode and making the
surface hierarchy inconsistent. Orange is also used for the primary send action
although the web baseline reserves `action-primary` (`#1E40AF`) for submit and
the warm accent for restrained attention.

Recommendation: map surfaces/text/actions/focus to the existing CSS variables,
add dark equivalents, use the 8–12px radius tokens, and reserve elevation for
raised overlays. Keep native’s vermilion token separate from web’s blue action.

## Medium priority

### 6. Mobile selected options communicate state by color alone

`apps/mobile/src/features/assistant/tutor-preference-draft-panel.tsx:146-165`
changes only background and text color when `active`; there is no checkmark,
border, or other visible non-color cue. `accessibilityState.selected` helps
screen readers but not sighted users with color-vision or contrast limits.

Recommendation: add a selected border/check icon (and preserve the state for
screen readers). Keep `accessibilityState.selected`.

### 7. Native option groups use button semantics instead of a radio-group model

`.../tutor-preference-draft-panel.tsx:140-149` exposes every choice as a
`button` without a group relationship. The visual behavior is mutually
exclusive, so TalkBack/VoiceOver users do not hear “one of N choices” or the
group label while traversing options.

Recommendation: expose a labelled group and radio-like selected semantics (or
use a native segmented/radio primitive) while retaining 48dp targets and 8dp
gaps.

### 8. Web controls become two columns before the documented mobile breakpoint

`apps/web/src/features/ai/tutor-preference-controls.tsx:63` uses
`sm:grid-cols-2` (Tailwind `sm` starts at 640px), while the design contract
defines 320–767px as one column. `:131` also sets select text to `text-sm`
(14px), below the 16px input baseline.

Recommendation: switch the two-column layout to the 768px breakpoint and keep
select/input text at 16px (labels may remain 14px).

### 9. CJK example text is not assigned a learning font/language

`apps/web/src/features/ai/tutor-response-panel.tsx:33-36` renders every field
with the UI stack; the Japanese/Chinese/Korean `example` has no pack-specific
font or `lang` metadata. Native `tutor-response-card.tsx:42-48` likewise uses
the default `AppText` for mixed-script content and does not provide a language
hint to the screen reader.

Recommendation: render the target-language field with the active CJK font stack
and language metadata/accessibility language. Keep Vietnamese explanation copy
in the UI font.

### 10. Ready responses remain stale when the draft changes

Both composers clear only error state on edit (`web:tutor-preference-draft.tsx:123-126`,
`mobile:assistant-screen.tsx:168-172`). A new unsent question can sit beside the
previous answer, with no visible submitted prompt/history in this bounded-form
slice.

Recommendation: show the submitted question above the response and mark a new
draft as “chưa gửi”, or clear the prior response as soon as the draft changes.

### 11. Mobile send does not dismiss the keyboard or reveal the response

`apps/mobile/src/features/assistant/assistant-screen.tsx:187-209` submits from
the `Pressable` but never dismisses the keyboard; the response is appended at
`:225-227` with no scroll/focus action. On a small phone the keyboard can cover
the first response sections and the user must dismiss and scroll manually.

Recommendation: dismiss the keyboard on submit, then scroll/focus the response
summary after success; verify with iOS/Android keyboard and landscape modes.

### 12. Web loading feedback is text-only and not cancellable

The web button changes to “Đang suy nghĩ…” and sets `aria-busy` at
`apps/web/src/features/ai/tutor-preference-draft.tsx:135-142`, but there is no
progress indicator, cancel action, or polite status announcement for a slow
request. Native has a spinner but also no cancel affordance.

Recommendation: add a small progress/skeleton state after 300ms, expose a
cancel action that aborts the request, and announce loading/complete politely.

### 13. Long AI strings can force horizontal overflow on web

`apps/web/src/features/ai/tutor-response-panel.tsx:36` uses
`whitespace-pre-wrap` without `break-words`/`overflow-wrap` or a `min-w-0`
guard on the grid item. A long URL, code token, or unbroken learner text can
escape a 320px viewport.

Recommendation: add a wrapping policy for unbroken tokens and test 320px with
long Vietnamese/CJK/URL content.

## What is already aligned

- Vietnamese-first labels, helper copy, privacy warning, and six bounded response
  sections are present on both platforms.
- Web uses semantic `form`, `label`, `fieldset`, `legend`, `h2`, and `h3`; the
  send button exposes `aria-busy`; transport errors are announced through a live
  region.
- Native uses shared theme/layout/typography tokens, 48dp controls, 8dp option
  gaps, pressed/disabled opacity states, safe-area scaffolding, and a tab bar
  that hides while the keyboard is visible.
- Both implementations preserve idempotent replay messaging and explain source
  boundaries instead of presenting AI output as official curriculum.

## Validation run

- `pnpm --filter @ideogram/web typecheck` — pass
- `pnpm --filter @ideogram/mobile typecheck` — pass
- `pnpm --filter @ideogram/web lint` — pass
- `pnpm --filter @ideogram/mobile lint` — pass
- Web `tutor-turn-client.test.ts` — 7 tests pass
- Mobile `assistant-state.test.ts` — 4 tests pass

## Unresolved questions

- Should the bounded form preserve the previous response while a new draft is
  being composed, or is the product intent one-turn-at-a-time with explicit
  draft/response pairing?
- Where should sign-in and AI-consent routes land from the tutor error state?
- Which active language-pack signal should drive CJK font and screen-reader
  language metadata for mixed response fields?

Status: DONE_WITH_CONCERNS
Summary: Bounded tutor flow is Vietnamese-first and type/lint clean, but response announcement/focus, auth recovery, web dark/token parity, and mobile task ordering need attention before accessibility/UX sign-off.
Concerns/Blockers: High-priority findings 1–5 remain; no code changed in this advisory review.
