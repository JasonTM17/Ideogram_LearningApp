# Ideogram Learning — Stitch handoff

These are design-reference artifacts for the first product slice. They are not
runtime code and must not be copied directly into either the Next.js web app or
the Expo mobile app.

## Source of truth

- Stitch project: `projects/11429302359379765748`
- Stitch design system: `assets/3415345924425844809` (version 2)
- Product design rules: [`docs/design-guidelines.md`](../../../docs/design-guidelines.md)
- Implementation token and component contract:
  [`design-system/ideogram-learning/MASTER.md`](../../../design-system/ideogram-learning/MASTER.md)

## Screen inventory

| Platform | Screen | Stitch screen ID | Export folder |
|---|---|---|---|
| Mobile | Hôm nay | `cd43f0ef499d49e39cfc1c21cd19b5a9` | `exports/mobile-today/` |
| Mobile | Ôn tập | `9d2db827bb834344802df8b9ee8f59f8` | `exports/mobile-review/` |
| Mobile | Trợ lý AI | `c6235e1a7f1044839b7731e3cf6c62c8` | `exports/mobile-ai-tutor/` |
| Mobile | Tiến độ | `c77595d71e4b4af8aaadf80ce775e4a3` | `exports/mobile-progress/` |
| Mobile | Bạn | `87618966856b4d34b06e2667055adebf` | `exports/mobile-profile/` |
| Desktop | Hôm nay | `e8f073b1346a48fab20bf029cf4b7340` | `exports/desktop-today/` |
| Desktop | Bài học | `39bebbcf1e844af2be7152c569f05333` | `exports/desktop-lesson/` |
| Desktop | Hàng đợi ôn | `b3e04fbade0748d6b5cc5232051fda4d` | `exports/desktop-review-queue/` |
| Desktop | Trợ lý AI | `745e799bc27f4c07bbfa33eeab8ecdd1` | `exports/desktop-ai-tutor/` |
| Desktop | Tiến độ | `16dc7d20c523402eb9b0e19e91a746c9` | `exports/desktop-progress/` |

Every export folder contains `design.png`, `design.html`, and `DESIGN.md` from
Stitch. The PNGs under `mobile/` and `desktop/` are retained visual-review
snapshots. `desktop-refined-*` is the approved Vietnamese-localized desktop
direction; use its matching export as implementation reference.

## Implementation constraints

- Rebuild using platform-native components: web uses Next.js UI; mobile uses
  Expo/React Native. Share design tokens, copy taxonomy, state models and
  analytics contracts—never a DOM screen shell.
- Treat all progress figures and learner names in these pictures as illustrative
  design content. Production UI must be driven by authenticated learner data,
  loading/empty/error/offline states, and accessibility semantics.
- The working name `Ideogram Learning` is not a final identity. Do not commission
  a permanent logo, app-store brand package, or trademark-dependent asset until
  the product name is approved.
