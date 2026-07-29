# Visual Design Research
Date: 2026-07-29
Scope: Vietnamese-first, multilingual language-learning web + mobile product for Stitch

## Sources
- Primary guidance: [Apple HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility), [Apple HIG Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode), [Apple HIG Typography](https://developer.apple.com/design/human-interface-guidelines/typography), [Apple HIG Tab Bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)
- Primary guidance: [Material 3 Color System](https://m3.material.io/styles/color/system/overview), [Material 3 Color Roles](https://m3.material.io/styles/color/roles), [Material 3 Navigation Bar](https://m3.material.io/components/navigation-bar/guidelines), [Material 3 Touch Targets](https://m3.material.io/foundations/designing/structure)
- Primary guidance: [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [WCAG Contrast](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html), [WCAG Target Size](https://www.w3.org/WAI/WCAG22/quickref/), [Focus Appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html)
- Typography data: [Be Vietnam Pro](https://fonts.google.com/specimen/Be%2BVietnam%2BPro), [Noto Sans](https://fonts.google.com/noto/specimen/Noto%2BSans), [Noto Sans JP](https://fonts.google.com/noto/specimen/Noto%2BSans%2BJP), [Noto Sans SC](https://fonts.google.com/noto/specimen/Noto%2BSans%2BSC), [Noto Sans KR](https://fonts.google.com/noto/specimen/Noto%2BSans%2BKR), [Google Noto overview](https://fonts.google.com/noto)
- Product comparisons: [Duolingo](https://www.duolingo.com/mobile), [Busuu](https://www.busuu.com/), [Memrise](https://www.memrise.com/), [LingQ](https://www.lingq.com/en/)

## What the market is doing
- Duolingo: playful, high-energy gamification, mascot-led motivation, streak-first framing.
- Busuu: compact expert lessons, cleaner editorial hierarchy, community/social proof.
- Memrise: real-world content, practical tone, less toy-like, more "learn to use".
- LingQ: dense, progress-measured, content-library feel; strong for serious learners but heavier visually.
- Repo context: existing `design-system/ideogram-learning/MASTER.md` is kid/playful. That is a mismatch for a cross-cultural adult/mixed-age language product unless the brand intentionally wants a youthful tone.

## Typography recommendation
- Best overall stack: `font-family: "Be Vietnam Pro", "Noto Sans", "Noto Sans JP", "Noto Sans SC", "Noto Sans KR", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;`
- Why: Be Vietnam Pro is explicitly tuned for Vietnamese diacritics; Noto covers the CJK scripts with mature Google Fonts families; system-ui keeps fallback stable.
- Locale overrides: `:lang(ja)` -> Noto Sans JP, `:lang(zh-Hans)` -> Noto Sans SC, `:lang(ko)` -> Noto Sans KR.
- Mono/data: `font-family: "Noto Sans Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;`

## Semantic palette proposal
- Light: bg `#F8FAFC`, surface `#FFFFFF`, surface-2 `#EEF2FF`, text `#0F172A`, muted `#475569`, primary `#1E40AF`, secondary `#0F766E`, accent `#C2410C`, success `#15803D`, warning `#D97706`, danger `#DC2626`
- Dark: bg `#0B1220`, surface `#111827`, surface-2 `#1F2937`, text `#E5E7EB`, muted `#94A3B8`, primary `#60A5FA`, secondary `#2DD4BF`, accent `#F59E0B`, success `#4ADE80`, warning `#FBBF24`, danger `#F87171`
- Rationale: calm, credible, not brand-coded to one country, and conservative enough for AA contrast when used as token pairs instead of raw decorative accents.

## Ranked visual directions
| Rank | Direction | Best fit | Trade-offs | Adoption risk |
|---|---|---|---|---|
| 1 | Editorial Scholar | Serious learning, exam prep, multilingual clarity | Less playful, slightly lower immediate "fun" | Low; closest to Apple/Material accessibility norms |
| 2 | Momentum Studio | Motivation-first, streaks, progress, audio drills | Higher visual energy but easier to overdo, more fatigue risk | Medium; can drift into Duolingo-like clutter |
| 3 | Quiet Atlas | Premium, calm, culturally neutral, content-heavy study | Can feel too restrained and less sticky for daily use | Low-medium; safer visually, weaker immediate excitement |

## Recommendation
- Choose `Editorial Scholar`.
- Why: it fits a Vietnamese-first product that must read cleanly across Latin + CJK, survives dark mode, and scales from quick drills to serious study without mascots or gimmicks.
- It also fits the repo architecture: Next.js web/admin + Expo mobile can share tokens, type scale, and semantic color roles cleanly.

## Stitch-ready prompt keywords
- `editorial, calm, multilingual, Vietnamese-first, accessible, study mode, spaced repetition, audio practice, rounded cards, soft blue-teal palette, paper-like surfaces, progress rings, clean hierarchy, light and dark theme, no mascot, no flags, no emoji icons, CJK-safe typography, mobile-first`

## Anti-patterns
- No country flags as language labels.
- No mascot-first branding, no emoji structural icons, no handwritten display fonts.
- No neon-on-dark body text, no low-contrast gray-on-gray surfaces, no hover-only affordances.
- No more than 5 top-level nav items; keep one primary CTA per screen.
- No decorative motion that hides loading, reduces readability, or ignores reduced-motion.

## Design notes for Stitch
- Use large, calm cards with generous whitespace, visible focus rings, and 44x44px touch targets.
- Use one icon family only; keep icons neutral and thin-stroke.
- Prefer progress-as-hierarchy, not progress-as-confetti.
- Use subtle gradients only on hero accents, not behind dense text.

## Why this is credible
- Apple, Material, and WCAG are primary standards sources, so the interaction and accessibility constraints are stable and low-risk.
- Google Fonts specimen pages are the source of truth for script coverage and make the typography stack defensible.
- The language-learning product comparisons are official homepages, so the pattern read is current but still only comparative evidence, not a design template to copy.

## Unresolved questions
- Should the launch lean adult/professional, or still keep some youth-friendly energy from the current project master?
- Will the first release need Chinese and Korean equal-weight in the UI, or only fallback support while Vietnamese and Japanese lead?
- Do we want the default app feel to be "exam prep" or "conversation practice"?
