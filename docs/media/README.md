# Media Sources and Regeneration

All repository visuals are derived from source-controlled project material. No
third-party stock artwork is required.

## Architecture

- Semantic source: `docs/diagrams/system-architecture.mmd`
- Renderer theme: `docs/diagrams/mermaid-config.json`
- Local Chrome bridge: `docs/diagrams/puppeteer-config.json`
- Reviewed vector: `docs/media/system-architecture.svg`
- README raster: `docs/media/system-architecture.png`

The learner/offline-sync explainer is a publish-grade SVG with a checked-in
PNG fallback:

- Reviewed vector: `docs/media/learning-and-sync-flow.svg`
- README raster: `docs/media/learning-and-sync-flow.png`

It summarizes implemented source boundaries. It does not claim that native
background execution or production-host replay has been certified.

Regenerate a Mermaid export with the current Mermaid CLI, then review labels and
connector routing before replacing the checked-in SVG:

```bash
pnpm dlx @mermaid-js/mermaid-cli@11.16.0 \
  -p docs/diagrams/puppeteer-config.json \
  -c docs/diagrams/mermaid-config.json \
  -b '#f8fafc' \
  -i docs/diagrams/system-architecture.mmd \
  -o docs/media/system-architecture.svg
```

Create the browser-rendered README raster with the same Mermaid CLI. Rendering
the PNG directly preserves labels that otherwise use SVG `foreignObject` markup:

```bash
pnpm dlx @mermaid-js/mermaid-cli@11.16.0 \
  -p docs/diagrams/puppeteer-config.json \
  -c docs/diagrams/mermaid-config.json \
  -b '#f8fafc' -w 1800 -H 1080 \
  -i docs/diagrams/system-architecture.mmd \
  -o docs/media/system-architecture.png
```

Then sync the public review assets used by `/showcase`:

```powershell
Copy-Item docs/media/system-architecture.png apps/web/public/showcase/system-architecture.png
Copy-Item docs/media/project-tour.gif apps/web/public/showcase/project-tour.gif
```

## Project tour capture

The following files are real, credential-free captures of the locally running
`/showcase` route on 2026-08-04. They show the public project tour only; they
do not prove authenticated learner, browser-background, native-device, or
deployed-worker behavior.

- `project-tour-hero.png` - hero and entry point
- `project-tour-foundation.png` - implemented source boundaries and pre-beta foundation scope
- `project-tour-evidence.png` - architecture evidence and implemented/target-state boundary
- `project-tour-roadmap.png` - remaining open browser, device, hosted, and media gates
- `project-tour.gif` - optional animated sequence assembled from the four static frames
- `showcase-project-tour.png` - full-page capture after all lazy media loaded

Regenerate after starting `pnpm --filter @ideogram/web dev` on a local port
that is not already in use:

```powershell
agent-browser open http://127.0.0.1:3001/showcase
agent-browser set viewport 1262 900
agent-browser eval "document.querySelector('#evidence').scrollIntoView({block:'start'}); true"
agent-browser wait --fn "[...document.images].every(i=>i.complete && i.naturalWidth>0)"
agent-browser screenshot --full docs/media/showcase-project-tour.png
pwsh -NoProfile -File scripts/generate-readme-media.ps1

# Re-check section bounds after layout changes. These bounds match the 2026-08-04 capture.
magick docs/media/showcase-project-tour.png -crop 1262x878+0+0 +repage docs/media/project-tour-hero.png
magick docs/media/showcase-project-tour.png -crop 1262x1057+0+878 +repage docs/media/project-tour-foundation.png
magick docs/media/showcase-project-tour.png -crop 1262x756+0+1935 +repage docs/media/project-tour-evidence.png
magick docs/media/showcase-project-tour.png -crop 1262x1002+0+4212 +repage docs/media/project-tour-roadmap.png

# Fit each complete source frame onto one stable 1262x720 canvas before encoding.
$tourSources = @(
  'docs/media/project-tour-hero.png',
  'docs/media/project-tour-foundation.png',
  'docs/media/project-tour-evidence.png',
  'docs/media/project-tour-roadmap.png'
)
$tourFrames = for ($index = 0; $index -lt $tourSources.Count; $index++) {
  $frame = Join-Path $env:TEMP ("ideogram-tour-frame-{0}.png" -f ($index + 1))
  magick $tourSources[$index] -resize '1200x680>' -gravity center `
    -background '#07111f' -extent 1262x720 -strip $frame
  $frame
}
magick -delay 140 -loop 0 $tourFrames -layers Optimize docs/media/project-tour.gif
Copy-Item docs/media/project-tour.gif apps/web/public/showcase/project-tour.gif
```

<a href="./showcase-project-tour.png"><img src="./project-tour-hero.png" alt="Project tour capture thumbnail" width="760" /></a>

![Project tour GIF](./project-tour.gif)

## GitHub social preview

`ideogram-learning-social-preview.png` is a purpose-built 1280 x 640 banner.
Its right-side card embeds the real `/showcase` hero capture at a readable scale;
the left-side repository identity is composed separately so no product content
is clipped. It contains no synthetic learner state or private data.

Regenerate it with ImageMagick:

```powershell
pwsh -NoProfile -File scripts/generate-readme-media.ps1
magick identify docs/media/ideogram-learning-social-preview.png
```

The script fits `project-tour-hero.png` inside a bordered card, composites it
onto the dark repository banner, and checks the reviewed capture geometry before
rewriting any derived tour assets.

GitHub requires a repository administrator to upload this file once under
**Settings → General → Social preview**; committing the source alone does not
change the repository card.

![GitHub social preview source](./ideogram-learning-social-preview.png)

## Authenticated browser runtime

`browser-offline-runtime.png` is a credential-free capture from the local
authenticated `/today` runtime used for the IndexedDB and Background Sync
proof. The accompanying request/queue assertions are recorded in
[`docs/release/validation-evidence.md`](../release/validation-evidence.md).
It proves the local Chromium run only, not a deployed production host.

![Authenticated browser runtime](./browser-offline-runtime.png)

## Mobile learning flow

The GIF uses these Stitch exports in sequence:

1. `assets/designs/stitch/mobile/mobile-today.png`
2. `assets/designs/stitch/mobile/mobile-review.png`
3. `assets/designs/stitch/mobile/mobile-ai-tutor.png`
4. `assets/designs/stitch/mobile/mobile-progress.png`
5. `assets/designs/stitch/mobile/mobile-profile.png`

Regenerate the optimized preview by fitting every source into the same inner
viewport before adding one stable phone frame:

```powershell
$mobileSources = @(
  'assets/designs/stitch/mobile/mobile-today.png',
  'assets/designs/stitch/mobile/mobile-review.png',
  'assets/designs/stitch/mobile/mobile-ai-tutor.png',
  'assets/designs/stitch/mobile/mobile-progress.png',
  'assets/designs/stitch/mobile/mobile-profile.png'
)
$mobileFrames = for ($index = 0; $index -lt $mobileSources.Count; $index++) {
  $inner = Join-Path $env:TEMP ("ideogram-mobile-inner-{0}.png" -f ($index + 1))
  $frame = Join-Path $env:TEMP ("ideogram-mobile-frame-{0}.png" -f ($index + 1))
  magick $mobileSources[$index] -resize 'x480' -gravity center `
    -background '#f7f8fc' -extent 226x480 $inner
  magick -size 256x512 canvas:'#07111f' -fill '#f7f8fc' `
    -draw 'roundrectangle 7,7 248,504 20,20' $inner -gravity center `
    -composite -strip $frame
  $frame
}
magick -delay 140 -loop 0 $mobileFrames -layers Optimize `
  docs/media/mobile-learning-flow.gif
Copy-Item docs/media/mobile-learning-flow.gif apps/web/public/showcase/mobile-learning-flow.gif
```

The canonical implementation of the same steps is
[`scripts/generate-readme-media.ps1`](../../scripts/generate-readme-media.ps1).

Verify the result:

```bash
magick identify docs/media/system-architecture.png \
  docs/media/system-architecture.svg \
  docs/media/learning-and-sync-flow.png \
  docs/media/learning-and-sync-flow.svg \
  docs/media/ideogram-learning-social-preview.png \
  docs/media/mobile-learning-flow.gif
```

## Evidence rules

- Use real running-product captures for runtime claims.
- Label local, hosted-browser, native-device, and design-handoff evidence
  separately.
- Do not publish connection-error pages, credentials, personal data, mock
  progress, or placeholder content as product evidence.
- Keep alt text useful and describe the proof boundary next to each visual.
