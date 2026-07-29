import { listeningScriptFromRows, vocabularyEntriesFromRows } from './content-source-helpers.mjs';
import { unitOneListeningRows, unitOneVocabularyRows } from './unit-01-authored-content.mjs';
import { unitTwoListeningRows, unitTwoVocabularyRows } from './unit-02-authored-content.mjs';

const createDraftRights = () => ({
  adaptationAllowed: false,
  aiProviderProcessingAllowed: false,
  embeddingAllowed: false,
  redistributionAllowed: false,
});

const provenance = () => ({
  authorName: 'Ideogram Learning content team',
  licenseReference: 'content/licenses/manifest.md#japanese-n5-pilot',
  reviewerName: null,
  rights: createDraftRights(),
  sourceKind: 'original',
  sourceReference: 'Original Vietnamese-first Japanese N5 pilot source, version 1.0.0',
});

const lessonDetails = [
  {
    lessonId: 'ja-n5-l01-greetings-and-self-introduction',
    summaryVietnamese: 'Chào hỏi lịch sự, giới thiệu tên và phản hồi cơ bản.',
    titleVietnamese: 'Chào hỏi và tự giới thiệu',
  },
  {
    lessonId: 'ja-n5-l02-classroom-objects',
    summaryVietnamese: 'Chỉ định đồ vật, hỏi sở hữu và vị trí đơn giản.',
    titleVietnamese: 'Đồ vật trong lớp',
  },
  {
    lessonId: 'ja-n5-l03-numbers-and-time',
    summaryVietnamese: 'Đọc số cơ bản, hỏi giờ và thời lượng.',
    titleVietnamese: 'Số đếm và thời gian',
  },
  {
    lessonId: 'ja-n5-l04-places-and-directions',
    summaryVietnamese: 'Hỏi vị trí các địa điểm quen thuộc và chỉ hướng ngắn.',
    titleVietnamese: 'Địa điểm và phương hướng',
  },
  {
    lessonId: 'ja-n5-l05-daily-routine',
    summaryVietnamese: 'Mô tả giờ giấc sinh hoạt hằng ngày bằng thể lịch sự.',
    titleVietnamese: 'Sinh hoạt mỗi ngày',
  },
  {
    lessonId: 'ja-n5-l06-food-and-cafe',
    summaryVietnamese: 'Gọi món, hỏi giá và nói nhận xét rất cơ bản.',
    titleVietnamese: 'Đồ ăn và quán cà phê',
  },
  {
    lessonId: 'ja-n5-l07-home-and-family',
    summaryVietnamese: 'Giới thiệu gia đình, căn phòng và nơi ở.',
    titleVietnamese: 'Nhà và gia đình',
  },
  {
    lessonId: 'ja-n5-l08-transport-and-routes',
    summaryVietnamese: 'Đi lại bằng phương tiện công cộng và hỏi cách đi.',
    titleVietnamese: 'Di chuyển và lộ trình',
  },
  {
    lessonId: 'ja-n5-l09-shopping-basics',
    summaryVietnamese: 'Hỏi giá, màu sắc, kích cỡ và so sánh rất cơ bản.',
    titleVietnamese: 'Mua sắm cơ bản',
  },
  {
    lessonId: 'ja-n5-l10-invitations-and-plans',
    summaryVietnamese: 'Mời bạn, hẹn thời gian/địa điểm và từ chối lịch sự.',
    titleVietnamese: 'Lời mời và kế hoạch',
  },
  {
    lessonId: 'ja-n5-l11-weather-and-health',
    summaryVietnamese: 'Nói về thời tiết, cảm giác đau nhẹ và nghỉ ngơi.',
    titleVietnamese: 'Thời tiết và sức khỏe',
  },
  {
    lessonId: 'ja-n5-l12-integrated-review',
    summaryVietnamese: 'Ôn lại chiến lược hỏi lại, hiểu bài và tự luyện hằng ngày.',
    titleVietnamese: 'Ôn tập tích hợp',
  },
];

const buildVocabularyActivity = ({ lessonNumber, entries }) => ({
  activityId: `ja-n5-l${lessonNumber}-vocabulary`,
  activityType: 'vocabulary',
  estimatedMinutes: 12,
  instructionsVietnamese:
    'Đọc từ, kana/kanji và ví dụ. Tự trả lời nghĩa trước khi mở bản dịch tiếng Việt.',
  payload: { entries },
  provenance: provenance(),
  status: 'draft',
  targetScript: 'kana_kanji',
  titleVietnamese: 'Từ vựng chủ đề',
});

const buildListeningActivity = ({ lessonNumber, script }) => {
  const activityId = `ja-n5-${script.slug}`;
  return {
    activityId,
    activityType: 'listening',
    estimatedMinutes: 3,
    instructionsVietnamese:
      'Bản nháp biên tập: kiểm transcript trước. Khi bản thu được xuất bản, nghe tối đa hai lần rồi chọn đáp án.',
    payload: {
      audioAssetPath: `media/ja/n5/${activityId}.mp3`,
      audioProductionStatus: 'planned',
      questions: [
        {
          explanationVietnamese: `Đáp án đúng dựa trực tiếp trên hội thoại: ${script.correctAnswer}.`,
          options: [
            { isCorrect: true, optionId: 'option-a', text: script.correctAnswer },
            { isCorrect: false, optionId: 'option-b', text: script.distractorOne },
            { isCorrect: false, optionId: 'option-c', text: script.distractorTwo },
          ],
          prompt: script.promptVietnamese,
          questionId: `${activityId}-q1`,
        },
      ],
      transcript: script.transcript,
      transcriptVietnamese: script.transcriptVietnamese,
    },
    provenance: provenance(),
    status: 'draft',
    targetScript: 'kana_kanji',
    titleVietnamese: `Luyện nghe ${lessonNumber}: hội thoại ngắn`,
  };
};

const buildLesson = ({ detail, lessonNumber, listeningRows, vocabularyRows }) => ({
  activities: [
    buildVocabularyActivity({ lessonNumber, entries: vocabularyEntriesFromRows(vocabularyRows) }),
    ...listeningRows
      .flatMap((rows) => listeningScriptFromRows(rows))
      .filter((script) => script.slug.startsWith(`l${lessonNumber}-`))
      .map((script) => buildListeningActivity({ lessonNumber, script })),
  ],
  estimatedMinutes: 28,
  lessonId: detail.lessonId,
  sequence: Number(lessonNumber),
  summaryVietnamese: detail.summaryVietnamese,
  titleVietnamese: detail.titleVietnamese,
});

const buildUnit = ({ unitNumber, titleVietnamese, vocabularyRows, listeningRows }) => ({
  lessons: vocabularyRows.map((rows, index) => {
    const lessonNumber = String((unitNumber - 1) * 6 + index + 1).padStart(2, '0');
    return buildLesson({
      detail: lessonDetails[Number(lessonNumber) - 1],
      lessonNumber,
      listeningRows,
      vocabularyRows: rows,
    });
  }),
  sequence: unitNumber,
  titleVietnamese,
  unitId: `ja-n5-unit-${unitNumber}`,
});

export const buildJapaneseN5PilotManifest = () => ({
  contentReleaseId: 'ja-n5-vietnamese-first-pilot',
  languageCode: 'ja',
  levelCode: 'N5',
  objectiveKey: 'communication',
  provenance: provenance(),
  releaseStatus: 'review',
  titleVietnamese: 'Tiếng Nhật N5 cho người Việt — pilot nền tảng',
  units: [
    buildUnit({
      listeningRows: unitOneListeningRows,
      titleVietnamese: 'Nền tảng giao tiếp hằng ngày',
      unitNumber: 1,
      vocabularyRows: unitOneVocabularyRows,
    }),
    buildUnit({
      listeningRows: unitTwoListeningRows,
      titleVietnamese: 'Tình huống đời sống và tự ôn',
      unitNumber: 2,
      vocabularyRows: unitTwoVocabularyRows,
    }),
  ],
  version: 'v1.0.0',
});
