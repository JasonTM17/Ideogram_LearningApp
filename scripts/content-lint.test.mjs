import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { lintContentWorkspace } from './content-lint-lib.mjs';

const rights = {
  adaptationAllowed: true,
  aiProviderProcessingAllowed: true,
  embeddingAllowed: true,
  redistributionAllowed: true,
};

const provenance = {
  authorName: 'Pilot author',
  licenseReference: 'internal-original-content-v1',
  reviewerName: 'Pilot reviewer',
  rights,
  sourceKind: 'original',
  sourceReference: 'Internal authored source',
};

const writeJson = (workspaceRoot, relativePath, value) => {
  const filePath = path.join(workspaceRoot, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
};

const createValidWorkspace = (workspaceRoot) => {
  const activities = [
    ...Array.from({ length: 40 }, (_, index) => ({
      activityId: `listen-${index + 1}`,
      activityType: 'listening',
      audioProductionStatus: 'script_approved',
      estimatedMinutes: 3,
      instructionsVietnamese: 'Nghe và chọn đáp án phù hợp.',
      payload: {
        audioAssetPath: `media/ja/n5/listen-${index + 1}.mp3`,
        questions: [{ prompt: 'Chọn đáp án.', questionId: `q-${index + 1}`, options: [] }],
        transcript: 'こんにちは。',
        transcriptVietnamese: 'Xin chào.',
      },
      provenance,
      status: 'reviewed',
      targetScript: 'kana_kanji',
      titleVietnamese: 'Nghe mẫu',
    })),
    ...Array.from({ length: 4 }, (_, index) => ({
      activityId: `vocabulary-${index + 1}`,
      activityType: 'vocabulary',
      estimatedMinutes: 8,
      instructionsVietnamese: 'Ôn từ vựng theo ví dụ tiếng Việt.',
      payload: {
        entries: Array.from({ length: index === 3 ? 30 : 40 }, (_, entryIndex) => ({
          example: { translationVietnamese: 'Ví dụ.', value: 'れいです。' },
          meaningVietnamese: 'Nghĩa mẫu',
          reading: 'れい',
          term: `語${index}-${entryIndex}`,
        })),
      },
      provenance,
      status: 'reviewed',
      targetScript: 'kana_kanji',
      titleVietnamese: 'Từ vựng mẫu',
    })),
  ];

  const lessons = Array.from({ length: 12 }, (_, index) => ({
    activities: activities.filter((_, activityIndex) => activityIndex % 12 === index),
    estimatedMinutes: 20,
    lessonId: `lesson-${index + 1}`,
    sequence: index + 1,
    summaryVietnamese: 'Tóm tắt mẫu.',
    titleVietnamese: 'Bài mẫu',
  }));
  const manifest = {
    contentReleaseId: 'ja-n5-pilot-v1',
    languageCode: 'ja',
    levelCode: 'N5',
    objectiveKey: 'communication',
    provenance,
    releaseStatus: 'review',
    titleVietnamese: 'N5 pilot',
    units: [
      { lessons: lessons.slice(0, 6), sequence: 1, titleVietnamese: 'Unit 1', unitId: 'unit-1' },
      { lessons: lessons.slice(6), sequence: 2, titleVietnamese: 'Unit 2', unitId: 'unit-2' },
    ],
    version: 'v1.0.0',
  };
  writeJson(workspaceRoot, 'content/japanese/v1/manifest.json', manifest);
  writeJson(workspaceRoot, 'content/japanese/v1/placement-prompt-specs.json', {
    languageCode: 'ja',
    levelCode: 'N5',
    questions: Array.from({ length: 25 }, (_, index) => ({
      placementQuestionKey: `placement-${index + 1}`,
      promptVietnamese: 'Chọn hoặc trả lời theo yêu cầu.',
      sequence: index + 1,
      targetPrompt: 'こんにちは',
    })),
  });
  writeJson(workspaceRoot, 'content/contract-fixtures/chinese/manifest.json', {
    fixtureOnly: true,
    languageCode: 'zh',
    levelCode: 'HSK_1',
    releaseStatus: 'draft',
    romanization: 'nǐ hǎo',
    segmentation: ['你', '好'],
    targetScript: 'hanzi_simplified',
  });
  writeJson(workspaceRoot, 'content/contract-fixtures/korean/manifest.json', {
    fixtureOnly: true,
    languageCode: 'ko',
    levelCode: 'TOPIK_1',
    releaseStatus: 'draft',
    romanization: 'annyeonghaseyo',
    segmentation: ['안녕', '하세요'],
    targetScript: 'hangul',
  });
  const licensePath = path.join(workspaceRoot, 'content/licenses/manifest.md');
  mkdirSync(path.dirname(licensePath), { recursive: true });
  writeFileSync(licensePath, '## Japanese N5 pilot\n## Rights decision\n## Review ownership\n');
};

describe('content lint', () => {
  let workspaceRoot;

  beforeEach(() => {
    workspaceRoot = mkdtempSync(path.join(tmpdir(), 'ideogram-content-lint-'));
    createValidWorkspace(workspaceRoot);
  });

  afterEach(() => {
    rmSync(workspaceRoot, { force: true, recursive: true });
  });

  it('accepts a review-ready Japanese N5 corpus and hidden language fixtures', () => {
    expect(lintContentWorkspace({ workspaceRoot })).toEqual({ errors: [], valid: true });
  });

  it('blocks a placement prompt bundle that leaks scoring material', () => {
    const placementPath = path.join(
      workspaceRoot,
      'content/japanese/v1/placement-prompt-specs.json',
    );
    const placement = JSON.parse(readFileSync(placementPath, 'utf8'));
    placement.questions[0].correctAnswer = 'A';
    writeFileSync(placementPath, `${JSON.stringify(placement)}\n`);

    expect(lintContentWorkspace({ workspaceRoot }).errors.join('\n')).toMatch(
      /must not contain answers/u,
    );
  });

  it('blocks a hidden Chinese fixture from being promoted', () => {
    const fixturePath = path.join(workspaceRoot, 'content/contract-fixtures/chinese/manifest.json');
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
    fixture.releaseStatus = 'published';
    writeFileSync(fixturePath, `${JSON.stringify(fixture)}\n`);

    expect(lintContentWorkspace({ workspaceRoot }).errors.join('\n')).toMatch(/hidden draft/u);
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
});
