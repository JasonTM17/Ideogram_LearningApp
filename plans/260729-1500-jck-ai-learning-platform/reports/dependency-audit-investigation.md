# Dependency Audit Investigation

## Executive Summary
- **Issue:** `pnpm audit --prod` still reports 1 moderate advisory on `uuid`.
- **Impact:** Mobile workspace install carries a production-scoped audit warning even though CI only fails on high+ production findings.
- **Root cause:** `apps/mobile` depends on `expo@57.0.8`, which depends on `@expo/config-plugins@57.0.6`, which depends on `xcode@3.0.1`, which pins `uuid@^7.0.3`; npm advisory `GHSA-w5hq-g745-h8pq` flags all `uuid <11.1.1`.
- **Status:** Investigated, not remediated in-repo. No safe upstream-compatible upgrade available as of 2026-07-29.
- **Risk decision:** Accept temporarily with monitoring. Evidence says this repo does not reach the vulnerable advisory path in shipped runtime artifacts.

## Scope
- Read-only inputs reviewed:
  - `package.json`
  - `pnpm-lock.yaml`
  - `pnpm-workspace.yaml`
  - `apps/mobile/package.json`
  - `docs/external-dependency-matrix.md`
  - `plans/260729-1500-jck-ai-learning-platform/phase-01-foundation-and-delivery.md`
- Only file modified: this report.

## Timeline
- `2026-07-29T16:12:57+07:00` ran `pnpm why uuid`; confirmed single installed path `@ideogram/mobile -> expo@57.0.8 -> @expo/config-plugins@57.0.6 -> xcode@3.0.1 -> uuid@7.0.3`.
- `2026-07-29T16:12:57+07:00` ran `pnpm audit --prod`; confirmed only remaining production advisory is moderate `uuid` `GHSA-w5hq-g745-h8pq`.
- `2026-07-29T16:12:57+07:00` searched `node_modules/.pnpm/xcode@3.0.1/node_modules/xcode/lib/pbxProject.js`; found only `uuid.v4()` at line 90.
- `2026-07-29T16:12:57+07:00` searched `apps/mobile/dist`; found `NO_MATCH` for `config-plugins|xcode|pbxProject|@expo/config-plugins`.
- `2026-07-29T16:12:57+07:00` queried registry with `pnpm view xcode@latest version dependencies --json`; latest is still `3.0.1` and still depends on `uuid ^7.0.3`.

## Commands Run
```powershell
pnpm audit --json
pnpm audit
pnpm audit --prod
pnpm audit --prod --audit-level=high
pnpm why brace-expansion
pnpm why esbuild
pnpm why uuid
rg -n "brace-expansion|uuid@7.0.3|esbuild@0.27.7|xcode@" pnpm-lock.yaml
rg -n "uuid\.v[356]\(|uuid\.parse|uuid\.stringify|uuid\.v4\(" node_modules/.pnpm/xcode@3.0.1/node_modules/xcode/lib/pbxProject.js -S
rg -n "config-plugins|xcode|pbxProject|@expo/config-plugins" apps/mobile/dist -S
pnpm view xcode@latest version dependencies --json
pnpm view @expo/config-plugins@57.0.6 dependencies --json
pnpm view @expo/config-plugins@latest version dependencies --json
pnpm view expo@57.0.8 dependencies --json
pnpm view expo@latest version dependencies --json
pnpm view uuid@11.1.1 version
git log --oneline --decorate -10 -- package.json pnpm-lock.yaml pnpm-workspace.yaml apps/mobile/package.json docs/external-dependency-matrix.md
```

## Technical Analysis

### Audit Facts
- `pnpm audit --json` reported 3 advisories total:
  - `brace-expansion` high
  - `uuid` moderate
  - `esbuild` low
- `pnpm audit --prod` reported only 1 advisory:
  - `uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided`
- `pnpm audit --prod --audit-level=high` exited `0`.
- CI at `.github/workflows/ci.yml` enforces only `pnpm audit --prod --audit-level=high`.

### Hypotheses Tested

#### Hypothesis 1
`brace-expansion` is the remaining production warning.

- **Evidence tested:**
  - `pnpm audit --prod` excludes it.
  - `pnpm why brace-expansion` showed:
    - vulnerable `brace-expansion@1.1.16` only via `eslint`, `typescript-eslint`, `eslint-config-next`
    - patched `brace-expansion@5.0.8` also present elsewhere
- **Result:** eliminated. This is dev tooling only, not the remaining production audit finding.

#### Hypothesis 2
`esbuild` is the remaining production warning.

- **Evidence tested:**
  - `pnpm audit --prod` excludes it.
  - `pnpm why esbuild` showed vulnerable `esbuild@0.27.7` only via `apps/worker` devDependencies: `tsup`, `vite`, `vitest`.
- **Result:** eliminated. This is build/test tooling only, not the remaining production audit finding.

#### Hypothesis 3
The remaining production warning is `uuid@7.0.3` pulled by Expo mobile dependencies.

- **Evidence tested:**
  - `pnpm audit --prod` reported only `uuid`.
  - `pnpm why uuid` showed exactly one version: `uuid@7.0.3`.
  - Path terminates in `apps/mobile` production dependency chain:
    - `@ideogram/mobile`
    - `expo@57.0.8`
    - `@expo/config-plugins@57.0.6`
    - `xcode@3.0.1`
    - `uuid@7.0.3`
  - `apps/mobile/package.json` declares `expo` as a dependency, not a devDependency.
- **Result:** confirmed. This is the remaining production-scoped audit warning.

### Reachability / Exposure Analysis
- `xcode@3.0.1` package description: `parser for xcodeproj/project.pbxproj files`.
- `@expo/config-plugins@57.0.6` exports iOS/Android config-plugin helpers and depends on `xcode`.
- `expo@57.0.8` depends on `@expo/config-plugins`, so the package is installed in the mobile dependency tree even if app code never imports it directly.
- The specific installed `xcode` code uses only `uuid.v4()` in `lib/pbxProject.js:90`.
- Search of that file found no `uuid.v3`, `uuid.v5`, `uuid.v6`, `uuid.parse`, or `uuid.stringify`.
- The advisory text from `pnpm audit` is narrower than “all uuid usage”: it applies to `v3/v5/v6 when buf is provided`.
- Existing mobile export artifact `apps/mobile/dist` contains no matches for `config-plugins`, `xcode`, `pbxProject`, or `@expo/config-plugins`.
- `apps/mobile/index.ts` imports only `registerRootComponent` from `expo`; `apps/mobile/App.tsx` imports only runtime UI pieces.

### Root Cause
Root cause is dependency packaging, not app code:

1. `apps/mobile` installs `expo@57.0.8` as a runtime dependency.
2. `expo@57.0.8` currently packages `@expo/config-plugins@57.0.6` as a dependency.
3. `@expo/config-plugins@57.0.6` depends on `xcode@^3.0.1`.
4. `xcode@3.0.1` depends on `uuid@^7.0.3`.
5. npm advisory `GHSA-w5hq-g745-h8pq` flags `uuid <11.1.1`, so `pnpm audit --prod` reports it.

Confirmed by `pnpm audit --prod`, `pnpm why uuid`, installed package manifests, and lockfile entries.

## Environmental / Change Check
- `git log --oneline --decorate -10 -- package.json pnpm-lock.yaml pnpm-workspace.yaml apps/mobile/package.json docs/external-dependency-matrix.md` returned no recent commit evidence specific to this warning during the investigation window.
- Registry state as of **2026-07-29**:
  - `xcode@latest` = `3.0.1`, still depends on `uuid ^7.0.3`
  - `@expo/config-plugins@latest` = `57.0.6`, still depends on `xcode ^3.0.1`
  - `expo@latest` = `57.0.8`, still depends on `@expo/config-plugins ~57.0.6`
- Conclusion: no newer upstream release currently removes this path.

## Risk Decision
- **Severity from advisory:** moderate.
- **Install scope:** production dependency tree for `apps/mobile`.
- **Likely execution surface in this repo:** low.
  - Tooling package parses Xcode project files.
  - Installed `xcode` code path uses only `uuid.v4()`.
  - Current mobile app/runtime bundle search found no evidence that config-plugin/Xcode code is shipped in built output.
- **Decision:** accept temporarily, document as upstream Expo packaging debt, keep CI high-threshold gate unchanged unless policy changes.

## Safe Fix Availability
- **Patched vulnerable package exists:** `uuid@11.1.1`.
- **Safe upstream-compatible fix exists now:** **No, not by evidence.**
  - `xcode@latest` still pins `uuid ^7.0.3`.
  - `@expo/config-plugins@latest` still pins `xcode ^3.0.1`.
  - `expo@latest` still pins `@expo/config-plugins ~57.0.6`.
- **Why not force override now:** overriding `uuid` to `11.1.1` would cross `xcode`'s declared major range and would be an unsupported dependency contract change, not a proven safe compatible fix.

## Recommendations

### Immediate
- Keep current CI gate `pnpm audit --prod --audit-level=high`; it matches the present risk posture and does not block delivery on this moderate tooling-adjacent advisory.
- Track this finding explicitly as accepted upstream risk in dependency review notes until Expo/xcode publish a compatible fix.

### Short-term
- Add a scheduled dependency watch item:
  - check `expo`, `@expo/config-plugins`, and `xcode` releases weekly
  - rerun `pnpm audit --prod` after any Expo upgrade PR
- If policy tightens from `high` to `moderate`, evaluate either:
  - temporary exception process for this advisory, or
  - a separately validated override spike outside current scope

### Long-term
- When Expo publishes a line that removes `xcode -> uuid@7` or moves config-plugin tooling out of shipped dependencies, upgrade and re-audit.
- Add a lightweight recurring monitor in CI or dependabot review:
  - `pnpm audit --prod --json`
  - diff advisory IDs against previous baseline
  - alert only on new production advisories or severity escalation

## Supporting Evidence
- `package.json`: workspace CI/test/build scripts only; no direct `uuid`, `xcode`, or Expo config-plugin pins at root.
- `apps/mobile/package.json`: `expo` is a production dependency.
- `.github/workflows/ci.yml`: audit gate is production-only and high-threshold.
- `node_modules/.pnpm/xcode@3.0.1/node_modules/xcode/package.json`: description `parser for xcodeproj/project.pbxproj files`; dependency `uuid ^7.0.3`.
- `node_modules/.pnpm/xcode@3.0.1/node_modules/xcode/lib/pbxProject.js`: only observed call is `uuid.v4()`.
- `node_modules/.pnpm/@expo+config-plugins@57.0.6_typescript@5.9.3/node_modules/@expo/config-plugins/package.json`: depends on `xcode ^3.0.1`.
- `node_modules/.pnpm/expo@57.0.8_.../node_modules/expo/package.json`: depends on `@expo/config-plugins ~57.0.6`.

## Unresolved Questions
- None for root-cause identification. Only open item is upstream release timing, which is outside repo control.

Status: DONE_WITH_CONCERNS
Summary: Remaining production audit warning is `uuid@7.0.3` pulled transitively by Expo config-plugin tooling (`expo -> @expo/config-plugins -> xcode -> uuid`). Evidence indicates low practical exposure in current shipped runtime artifacts and no upstream-compatible fix exists as of 2026-07-29.
Concerns/Blockers: Upstream ecosystem blocker. Any immediate fix would require an unsupported override or waiting for Expo/xcode to publish a compatible update.
