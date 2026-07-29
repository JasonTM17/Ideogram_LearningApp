import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildJapaneseN5PilotManifest } from '../content/japanese/v1/source/pilot-release-manifest.mjs';
import { contentReleaseManifestSchema } from '../packages/contracts/src/content/content-manifest-contract.ts';
import { lintContentWorkspace } from './content-lint-lib.mjs';
import { createValidContentWorkspace } from './content-lint-test-fixtures.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('content lint', () => {
  let workspaceRoot;

  beforeEach(() => {
    workspaceRoot = mkdtempSync(path.join(tmpdir(), 'ideogram-content-lint-'));
    createValidContentWorkspace(workspaceRoot);
  });

  afterEach(() => {
    rmSync(workspaceRoot, { force: true, recursive: true });
  });

  it('accepts a review-ready Japanese N5 corpus and hidden language fixtures', () => {
    expect(lintContentWorkspace({ workspaceRoot })).toEqual({ errors: [], valid: true });
  });

  it('blocks a hidden Chinese fixture from being promoted', () => {
    const fixturePath = path.join(workspaceRoot, 'content/contract-fixtures/chinese/manifest.json');
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
    fixture.releaseStatus = 'published';
    writeFileSync(fixturePath, `${JSON.stringify(fixture)}\n`);

    expect(lintContentWorkspace({ workspaceRoot }).errors.join('\n')).toMatch(/hidden draft/u);
  });

  it('requires tone-marked Chinese pinyin in the hidden contract fixture', () => {
    const fixturePath = path.join(workspaceRoot, 'content/contract-fixtures/chinese/manifest.json');
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
    fixture.romanization = 'ni hao';
    writeFileSync(fixturePath, `${JSON.stringify(fixture)}\n`);

    expect(lintContentWorkspace({ workspaceRoot }).errors.join('\n')).toMatch(
      /tone-marked pinyin/u,
    );
  });

  it('requires a named reviewer before an activity is marked reviewed', () => {
    const manifestPath = path.join(workspaceRoot, 'content/japanese/v1/manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    manifest.units[0].lessons[0].activities[0].provenance.reviewerName = null;
    writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`);

    expect(lintContentWorkspace({ workspaceRoot }).errors.join('\n')).toMatch(
      /requires a named reviewer/u,
    );
  });

  it('blocks a listening question without exactly one correct option', () => {
    const manifestPath = path.join(workspaceRoot, 'content/japanese/v1/manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    manifest.units[0].lessons[0].activities[0].payload.questions[0].options[1].isCorrect = true;
    writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`);

    expect(lintContentWorkspace({ workspaceRoot }).errors.join('\n')).toMatch(
      /exactly one correct option/u,
    );
  });
});

describe('committed Japanese N5 pilot corpus', () => {
  it('is generated deterministically and conforms to the shared content contract', () => {
    const manifestPath = path.join(repositoryRoot, 'content/japanese/v1/manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const parseResult = contentReleaseManifestSchema.safeParse(manifest);

    expect(manifest).toEqual(buildJapaneseN5PilotManifest());
    expect(
      parseResult.success,
      parseResult.success ? undefined : JSON.stringify(parseResult.error.issues, null, 2),
    ).toBe(true);
    const parsedListeningActivity = parseResult.data.units[0]?.lessons[0]?.activities.find(
      (activity) => activity.activityType === 'listening',
    );
    expect(parsedListeningActivity?.payload.audioProductionStatus).toBe('planned');
  });
});
