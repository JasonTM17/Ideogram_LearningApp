[CmdletBinding()]
param(
  [string]$CapturePath = 'docs/media/showcase-project-tour.png'
)

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$mediaRoot = Join-Path $repoRoot 'docs\media'
$publicMediaRoot = Join-Path $repoRoot 'apps\web\public\showcase'
$resolvedCapture = (Resolve-Path -LiteralPath (Join-Path $repoRoot $CapturePath)).Path
$temporaryRoot = Join-Path $env:TEMP 'ideogram-readme-media'

if (-not (Get-Command magick -ErrorAction SilentlyContinue)) {
  throw 'ImageMagick CLI (magick) is required.'
}

New-Item -ItemType Directory -Force -Path $temporaryRoot | Out-Null

function Invoke-Magick {
  param([Parameter(Mandatory)][string[]]$Arguments)

  & magick @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "ImageMagick failed with exit code $LASTEXITCODE."
  }
}

$captureGeometry = (& magick identify -format '%wx%h' $resolvedCapture).Trim()
if ($captureGeometry -ne '1262x5214') {
  throw "Expected the reviewed 1262x5214 showcase capture, received $captureGeometry. Re-check section bounds before regeneration."
}

$tourCrops = @(
  @{ Name = 'project-tour-hero.png'; Geometry = '1262x878+0+0' },
  @{ Name = 'project-tour-foundation.png'; Geometry = '1262x1057+0+878' },
  @{ Name = 'project-tour-evidence.png'; Geometry = '1262x756+0+1935' },
  @{ Name = 'project-tour-roadmap.png'; Geometry = '1262x1002+0+4212' }
)

foreach ($crop in $tourCrops) {
  Invoke-Magick @(
    $resolvedCapture,
    '-crop', $crop.Geometry,
    '+repage',
    '-strip',
    '-define', 'png:compression-level=9',
    (Join-Path $mediaRoot $crop.Name)
  )
}

$tourFrames = @()
for ($index = 0; $index -lt $tourCrops.Count; $index++) {
  $source = Join-Path $mediaRoot $tourCrops[$index].Name
  $frame = Join-Path $temporaryRoot ("tour-frame-{0}.png" -f ($index + 1))
  Invoke-Magick @(
    $source,
    '-resize', '1200x680>',
    '-gravity', 'center',
    '-background', '#07111f',
    '-extent', '1262x720',
    '-strip',
    $frame
  )
  $tourFrames += $frame
}

$tourGifArguments = @('-delay', '140', '-loop', '0')
$tourGifArguments += $tourFrames
$tourGifArguments += @('-layers', 'Optimize', (Join-Path $mediaRoot 'project-tour.gif'))
Invoke-Magick $tourGifArguments
Invoke-Magick @(
  (Join-Path $mediaRoot 'project-tour.gif'),
  (Join-Path $publicMediaRoot 'project-tour.gif')
)

$mobileSources = @(
  'assets\designs\stitch\mobile\mobile-today.png',
  'assets\designs\stitch\mobile\mobile-review.png',
  'assets\designs\stitch\mobile\mobile-ai-tutor.png',
  'assets\designs\stitch\mobile\mobile-progress.png',
  'assets\designs\stitch\mobile\mobile-profile.png'
)
$mobileFrames = @()
for ($index = 0; $index -lt $mobileSources.Count; $index++) {
  $source = Join-Path $repoRoot $mobileSources[$index]
  $inner = Join-Path $temporaryRoot ("mobile-inner-{0}.png" -f ($index + 1))
  $frame = Join-Path $temporaryRoot ("mobile-frame-{0}.png" -f ($index + 1))
  Invoke-Magick @(
    $source,
    '-resize', 'x480',
    '-gravity', 'center',
    '-background', '#f7f8fc',
    '-extent', '226x480',
    $inner
  )
  Invoke-Magick @(
    '-size', '256x512',
    'canvas:#07111f',
    '-fill', '#f7f8fc',
    '-draw', 'roundrectangle 7,7 248,504 20,20',
    $inner,
    '-gravity', 'center',
    '-composite',
    '-strip',
    $frame
  )
  $mobileFrames += $frame
}

$mobileGifArguments = @('-delay', '140', '-loop', '0')
$mobileGifArguments += $mobileFrames
$mobileGifArguments += @(
  '-layers', 'Optimize',
  (Join-Path $mediaRoot 'mobile-learning-flow.gif')
)
Invoke-Magick $mobileGifArguments
Invoke-Magick @(
  (Join-Path $mediaRoot 'mobile-learning-flow.gif'),
  (Join-Path $publicMediaRoot 'mobile-learning-flow.gif')
)

$heroCard = Join-Path $temporaryRoot 'social-preview-hero-card.png'
Invoke-Magick @(
  (Join-Path $mediaRoot 'project-tour-hero.png'),
  '-resize', '700x500',
  '-gravity', 'center',
  '-background', '#07111f',
  '-extent', '700x500',
  '-bordercolor', '#60a5fa',
  '-border', '6',
  $heroCard
)

$socialPreview = Join-Path $mediaRoot 'ideogram-learning-social-preview.png'
Invoke-Magick @(
  '-size', '1280x640',
  'gradient:#071426-#171719',
  '-gravity', 'northwest',
  '-fill', '#60a5fa',
  '-draw', 'roundrectangle 54,54 118,118 16,16',
  '-font', 'Segoe-UI-Bold',
  '-pointsize', '34',
  '-fill', '#071426',
  '-annotate', '+79+101', 'I',
  '-font', 'Segoe-UI-Bold',
  '-pointsize', '48',
  '-fill', '#f8fafc',
  '-annotate', '+54+184', 'Ideogram Learning',
  '-font', 'Segoe-UI',
  '-pointsize', '20',
  '-fill', '#93c5fd',
  '-annotate', '+54+238', 'REPOSITORY PREVIEW',
  '-pointsize', '28',
  '-fill', '#cbd5e1',
  '-annotate', '+54+290', 'Vietnamese-first',
  '-annotate', '+54+332', 'language learning',
  '-pointsize', '20',
  '-fill', '#f59e0b',
  '-annotate', '+54+407', 'Next.js  ·  Expo  ·  Supabase',
  '-fill', '#94a3b8',
  '-annotate', '+54+460', 'Web + mobile + offline sync',
  $heroCard,
  '-geometry', '+522+64',
  '-composite',
  '-depth', '8',
  '-strip',
  '-define', 'png:compression-level=9',
  $socialPreview
)

Write-Output 'README media regenerated and public showcase GIFs synchronized.'
