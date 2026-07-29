# Media Sources and Regeneration

All repository visuals are derived from source-controlled project material. No
third-party stock artwork is required.

## Architecture

- Semantic source: `docs/diagrams/system-architecture.mmd`
- Reviewed vector: `docs/media/system-architecture.svg`
- README raster: `docs/media/system-architecture.png`

Regenerate a Mermaid export with the current Mermaid CLI, then review labels and
connector routing before replacing the checked-in SVG:

```bash
pnpm dlx @mermaid-js/mermaid-cli@11.16.0 \
  -i docs/diagrams/system-architecture.mmd \
  -o docs/media/system-architecture.svg
```

Create the README-sized raster with ImageMagick:

```bash
magick -background none docs/media/system-architecture.svg \
  -resize 1800x1080 docs/media/system-architecture.png
```

## Mobile learning flow

The GIF uses these Stitch exports in sequence:

1. `assets/designs/stitch/mobile/mobile-today.png`
2. `assets/designs/stitch/mobile/mobile-review.png`
3. `assets/designs/stitch/mobile/mobile-ai-tutor.png`
4. `assets/designs/stitch/mobile/mobile-progress.png`
5. `assets/designs/stitch/mobile/mobile-profile.png`

Regenerate the optimized preview:

```bash
magick -delay 140 -loop 0 \
  assets/designs/stitch/mobile/mobile-today.png \
  assets/designs/stitch/mobile/mobile-review.png \
  assets/designs/stitch/mobile/mobile-ai-tutor.png \
  assets/designs/stitch/mobile/mobile-progress.png \
  assets/designs/stitch/mobile/mobile-profile.png \
  -resize 256x512 docs/media/mobile-learning-flow.gif
```

Verify the result:

```bash
magick identify docs/media/system-architecture.png \
  docs/media/system-architecture.svg \
  docs/media/mobile-learning-flow.gif
```
