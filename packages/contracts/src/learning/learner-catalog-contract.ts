import { z } from 'zod';

import {
  contentIdentifierSchema,
  contentReleaseManifestSchema,
} from '../content/content-manifest-contract';
import {
  languagePackCodes,
  learningObjectiveKeys,
  targetScriptKinds,
} from '../content/content-vocabulary';
import {
  learnerCatalogActivityPromptPayloadSchemas,
  projectLearnerCatalogPromptPayload,
} from './learner-catalog-payload-contract';

import type { activityManifestSchema } from '../content/content-manifest-contract';

export {
  learnerCatalogActivityPromptPayloadSchemas,
  projectLearnerCatalogPromptPayload,
} from './learner-catalog-payload-contract';
export type { LearnerCatalogActivityPromptPayload } from './learner-catalog-payload-contract';

const rubyAnnotationStateSchema = z.enum(['planned', 'not_applicable']);

const createActivitySchema = <
  TActivityType extends keyof typeof learnerCatalogActivityPromptPayloadSchemas,
>(
  activityType: TActivityType,
) =>
  z
    .object({
      activityId: contentIdentifierSchema,
      activityType: z.literal(activityType),
      estimatedMinutes: z.number().int().min(1).max(45),
      instructionsVietnamese: z.string().min(1).max(2_000),
      payload: learnerCatalogActivityPromptPayloadSchemas[activityType],
      rubyAnnotationState: rubyAnnotationStateSchema,
      targetScript: z.enum(targetScriptKinds),
      titleVietnamese: z.string().min(1).max(240),
    })
    .strict();

export const learnerCatalogActivitySchema = z.discriminatedUnion('activityType', [
  createActivitySchema('grammar'),
  createActivitySchema('listening'),
  createActivitySchema('objective_quiz'),
  createActivitySchema('reading'),
  createActivitySchema('retrieval'),
  createActivitySchema('speaking'),
  createActivitySchema('vocabulary'),
  createActivitySchema('writing'),
]);

export const learnerCatalogLessonSchema = z
  .object({
    activities: z.array(learnerCatalogActivitySchema).min(1).max(20),
    estimatedMinutes: z.number().int().min(5).max(90),
    lessonId: contentIdentifierSchema,
    sequence: z.number().int().min(1).max(200),
    summaryVietnamese: z.string().min(1).max(2_000),
    titleVietnamese: z.string().min(1).max(240),
  })
  .strict();
export const learnerTodayLessonSchema = learnerCatalogLessonSchema;

const learnerCatalogUnitSchema = z
  .object({
    lessons: z.array(learnerCatalogLessonSchema).min(1).max(20),
    sequence: z.number().int().min(1).max(100),
    titleVietnamese: z.string().min(1).max(240),
    unitId: contentIdentifierSchema,
  })
  .strict();
const learnerCatalogReleaseSchema = z
  .object({
    contentReleaseId: contentIdentifierSchema,
    levelCode: z.string().min(1).max(32),
    objectiveKey: z.enum(learningObjectiveKeys),
    titleVietnamese: z.string().min(1).max(240),
    units: z.array(learnerCatalogUnitSchema).min(1).max(20),
    version: z.string().regex(/^v\d+\.\d+\.\d+$/u),
  })
  .strict();
export const learnerCatalogResponseSchema = z
  .object({
    languagePacks: z
      .array(
        z
          .object({
            displayName: z.string().min(1).max(120),
            languageCode: z.enum(languagePackCodes),
            releases: z.array(learnerCatalogReleaseSchema).max(12),
          })
          .strict(),
      )
      .max(3),
  })
  .strict();

const learnerCatalogSourceSchema = z
  .object({
    languagePacks: z
      .array(
        z
          .object({
            availabilityState: z.enum(['hidden', 'active', 'retired']),
            displayName: z.string().min(1).max(120),
            languageCode: z.enum(languagePackCodes),
            releases: z.array(contentReleaseManifestSchema).max(12),
          })
          .strict(),
      )
      .max(3),
  })
  .strict();

type LearnerCatalogSourceActivity = z.infer<typeof activityManifestSchema>;
type LearnerCatalogSourceRelease = z.infer<typeof contentReleaseManifestSchema>;
type LearnerCatalogProjectedResponse = z.infer<typeof learnerCatalogResponseSchema>;

const projectActivity = (activity: LearnerCatalogSourceActivity) => {
  if (activity.status !== 'published')
    throw new TypeError('Learner catalog exposes only published activities.');
  return {
    activityId: activity.activityId,
    activityType: activity.activityType,
    estimatedMinutes: activity.estimatedMinutes,
    instructionsVietnamese: activity.instructionsVietnamese,
    payload: projectLearnerCatalogPromptPayload(activity.activityType, activity.payload),
    rubyAnnotationState: activity.targetScript === 'kana_kanji' ? 'planned' : 'not_applicable',
    targetScript: activity.targetScript,
    titleVietnamese: activity.titleVietnamese,
  };
};

const projectRelease = (languageCode: string, release: LearnerCatalogSourceRelease) => {
  if (release.languageCode !== languageCode)
    throw new TypeError('Release language must match its language pack.');
  if (release.releaseStatus !== 'published')
    throw new TypeError('Learner catalog exposes only published releases.');
  return {
    contentReleaseId: release.contentReleaseId,
    levelCode: release.levelCode,
    objectiveKey: release.objectiveKey,
    titleVietnamese: release.titleVietnamese,
    units: release.units.map((unit) => ({
      lessons: unit.lessons.map((lesson) => ({
        activities: lesson.activities.map(projectActivity),
        estimatedMinutes: lesson.estimatedMinutes,
        lessonId: lesson.lessonId,
        sequence: lesson.sequence,
        summaryVietnamese: lesson.summaryVietnamese,
        titleVietnamese: lesson.titleVietnamese,
      })),
      sequence: unit.sequence,
      titleVietnamese: unit.titleVietnamese,
      unitId: unit.unitId,
    })),
    version: release.version,
  };
};

export const projectLearnerCatalogResponse = (input: unknown): LearnerCatalogProjectedResponse =>
  learnerCatalogResponseSchema.parse({
    languagePacks: learnerCatalogSourceSchema.parse(input).languagePacks.map((languagePack) => {
      if (languagePack.availabilityState !== 'active')
        throw new TypeError('Learner catalog exposes only active language packs.');
      return {
        displayName: languagePack.displayName,
        languageCode: languagePack.languageCode,
        releases: languagePack.releases.map((release) =>
          projectRelease(languagePack.languageCode, release),
        ),
      };
    }),
  });

export type LearnerCatalogActivity = z.infer<typeof learnerCatalogActivitySchema>;
export type LearnerCatalogLesson = z.infer<typeof learnerCatalogLessonSchema>;
export type LearnerCatalogResponse = z.infer<typeof learnerCatalogResponseSchema>;
export type LearnerTodayLesson = z.infer<typeof learnerTodayLessonSchema>;
