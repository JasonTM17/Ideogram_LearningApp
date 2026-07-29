import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { lintContentWorkspace } from './content-lint-lib.mjs';
import { createValidContentWorkspace } from './content-lint-test-fixtures.mjs';

describe('content security gates', () => {
  let workspaceRoot;

  beforeEach(() => {
    workspaceRoot = mkdtempSync(path.join(tmpdir(), 'ideogram-content-security-'));
    createValidContentWorkspace(workspaceRoot);
  });

  afterEach(() => {
    rmSync(workspaceRoot, { force: true, recursive: true });
  });

  it('blocks non-allowlisted placement fields even when they avoid common scoring names', () => {
    const placementPath = path.join(
      workspaceRoot,
      'content/japanese/v1/placement-prompt-specs.json',
    );
    const placement = JSON.parse(readFileSync(placementPath, 'utf8'));
    placement.questions[0].solution = 'option-a';
    writeFileSync(placementPath, `${JSON.stringify(placement)}\n`);

    expect(lintContentWorkspace({ workspaceRoot }).errors.join('\n')).toMatch(
      /only learner-safe allowlisted fields/u,
    );
  });

  it('blocks a release whose rights diverge from the pending approval ledger', () => {
    const manifestPath = path.join(workspaceRoot, 'content/japanese/v1/manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    manifest.provenance.rights.embeddingAllowed = true;
    writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`);

    expect(lintContentWorkspace({ workspaceRoot }).errors.join('\n')).toMatch(
      /must match release provenance/u,
    );
  });

  it('blocks activity rights that diverge from the release approval ledger', () => {
    const manifestPath = path.join(workspaceRoot, 'content/japanese/v1/manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    manifest.units[0].lessons[0].activities[0].provenance.rights.embeddingAllowed = true;
    writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`);

    expect(lintContentWorkspace({ workspaceRoot }).errors.join('\n')).toMatch(
      /must match activity .* provenance/u,
    );
  });

  it('blocks recorded audio without a checksum-verified local registry asset', () => {
    const manifestPath = path.join(workspaceRoot, 'content/japanese/v1/manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const listeningActivity = manifest.units[0].lessons[0].activities[0];
    listeningActivity.payload.audioProductionStatus = 'recorded';
    listeningActivity.payload.audioSha256 = 'a'.repeat(64);
    writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`);

    expect(lintContentWorkspace({ workspaceRoot }).errors.join('\n')).toMatch(
      /missing verified asset registry entry/u,
    );
  });

  it('accepts recorded audio only when its local file checksum matches the registry', () => {
    const manifestPath = path.join(workspaceRoot, 'content/japanese/v1/manifest.json');
    const registryPath = path.join(workspaceRoot, 'content/media/recorded-audio-assets.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const listeningActivity = manifest.units[0].lessons[0].activities[0];
    const audioBytes = Buffer.from('recorded-audio-fixture');
    const checksum = createHash('sha256').update(audioBytes).digest('hex');
    const localFilePath = 'content/media/audio/listen-1.mp3';

    listeningActivity.payload.audioProductionStatus = 'recorded';
    listeningActivity.payload.audioSha256 = checksum;
    mkdirSync(path.dirname(path.join(workspaceRoot, localFilePath)), { recursive: true });
    writeFileSync(path.join(workspaceRoot, localFilePath), audioBytes);
    writeFileSync(
      registryPath,
      `${JSON.stringify({
        assets: [
          {
            audioAssetPath: listeningActivity.payload.audioAssetPath,
            localFilePath,
            sha256: checksum,
          },
        ],
      })}\n`,
    );
    writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`);

    expect(lintContentWorkspace({ workspaceRoot })).toEqual({ errors: [], valid: true });
  });
});
