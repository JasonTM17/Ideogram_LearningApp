import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const rights = {
  adaptationAllowed: false,
  aiProviderProcessingAllowed: false,
  embeddingAllowed: false,
  redistributionAllowed: false,
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

export const createValidContentWorkspace = (workspaceRoot) => {
  const activities = [
    ...Array.from({ length: 40 }, (_, index) => ({
      activityId: `listen-${index + 1}`,
      activityType: 'listening',
      estimatedMinutes: 3,
      instructionsVietnamese: 'Nghe và chọn đáp án phù hợp.',
      payload: {
        audioAssetPath: `media/ja/n5/listen-${index + 1}.mp3`,
        audioProductionStatus: 'planned',
        questions: [
          {
            explanationVietnamese: 'Giải thích mẫu.',
            options: [
              { isCorrect: true, optionId: 'option-a', text: 'A' },
              { isCorrect: false, optionId: 'option-b', text: 'B' },
            ],
            prompt: 'Chọn đáp án.',
            questionId: `q-${index + 1}`,
          },
        ],
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
  writeJson(workspaceRoot, 'content/japanese/v1/manifest.json', {
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
  });
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
    examMapping: { framework: 'HSK', level: 'HSK_1' },
    fixtureOnly: true,
    languageCode: 'zh',
    levelCode: 'HSK_1',
    releaseStatus: 'draft',
    romanization: 'nǐ hǎo',
    segmentation: [
      { pinyin: 'nǐ', surface: '你' },
      { pinyin: 'hǎo', surface: '好' },
    ],
    rubricContract: { romanizationRequired: true, targetScript: 'hanzi_simplified' },
    targetScript: 'hanzi_simplified',
  });
  writeJson(workspaceRoot, 'content/contract-fixtures/korean/manifest.json', {
    examMapping: { framework: 'TOPIK', level: 'TOPIK_1' },
    fixtureOnly: true,
    languageCode: 'ko',
    levelCode: 'TOPIK_1',
    releaseStatus: 'draft',
    romanization: 'annyeonghaseyo',
    segmentation: [
      { romanization: 'annyeong', surface: '안녕' },
      { romanization: 'haseyo', surface: '하세요' },
    ],
    rubricContract: { romanizationRequired: true, targetScript: 'hangul' },
    targetScript: 'hangul',
  });
  const licensePath = path.join(workspaceRoot, 'content/licenses/manifest.md');
  mkdirSync(path.dirname(licensePath), { recursive: true });
  writeFileSync(licensePath, '## Japanese N5 pilot\n## Rights decision\n## Review ownership\n');
  writeJson(workspaceRoot, 'content/licenses/release-rights-status.json', {
    approvalStatus: 'pending',
    approvedAt: null,
    approvedBy: null,
    contentReleaseId: 'ja-n5-pilot-v1',
    evidenceReference: 'content/licenses/manifest.md#rights-decision',
    rights,
  });
  writeJson(workspaceRoot, 'content/media/recorded-audio-assets.json', { assets: [] });
};
