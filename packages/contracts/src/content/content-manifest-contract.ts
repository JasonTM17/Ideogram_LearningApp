import { z } from 'zod';

import { activityPayloadSchemas } from './activity-payload-schemas';
import {
  contentItemStatuses,
  contentIdentifierPattern,
  contentReleaseStatuses,
  contentSourceKinds,
  languagePackCodes,
  learningObjectiveKeys,
  targetScriptKinds,
} from './content-vocabulary';

export const contentIdentifierSchema = z.string().regex(contentIdentifierPattern);

export const contentRightsSchema = z.object({
  adaptationAllowed: z.boolean(),
  aiProviderProcessingAllowed: z.boolean(),
  embeddingAllowed: z.boolean(),
  redistributionAllowed: z.boolean(),
});

export const contentProvenanceSchema = z.object({
  authorName: z.string().min(1).max(160),
  licenseReference: z.string().min(1).max(300),
  reviewerName: z.string().min(1).max(160).nullable(),
  rights: contentRightsSchema,
  sourceKind: z.enum(contentSourceKinds),
  sourceReference: z.string().min(1).max(500),
});

const activityBaseSchema = z.object({
  activityId: contentIdentifierSchema,
  estimatedMinutes: z.number().int().min(1).max(45),
  instructionsVietnamese: z.string().min(1).max(2_000),
  provenance: contentProvenanceSchema,
  status: z.enum(contentItemStatuses),
  targetScript: z.enum(targetScriptKinds),
  titleVietnamese: z.string().min(1).max(240),
});

const grammarActivitySchema = activityBaseSchema.extend({
  activityType: z.literal('grammar'),
  payload: activityPayloadSchemas.grammar,
});

const listeningActivitySchema = activityBaseSchema.extend({
  activityType: z.literal('listening'),
  payload: activityPayloadSchemas.listening,
});

const objectiveQuizActivitySchema = activityBaseSchema.extend({
  activityType: z.literal('objective_quiz'),
  payload: activityPayloadSchemas.objective_quiz,
});

const readingActivitySchema = activityBaseSchema.extend({
  activityType: z.literal('reading'),
  payload: activityPayloadSchemas.reading,
});

const retrievalActivitySchema = activityBaseSchema.extend({
  activityType: z.literal('retrieval'),
  payload: activityPayloadSchemas.retrieval,
});

const speakingActivitySchema = activityBaseSchema.extend({
  activityType: z.literal('speaking'),
  payload: activityPayloadSchemas.speaking,
});

const vocabularyActivitySchema = activityBaseSchema.extend({
  activityType: z.literal('vocabulary'),
  payload: activityPayloadSchemas.vocabulary,
});

const writingActivitySchema = activityBaseSchema.extend({
  activityType: z.literal('writing'),
  payload: activityPayloadSchemas.writing,
});

export const activityManifestSchema = z.discriminatedUnion('activityType', [
  grammarActivitySchema,
  listeningActivitySchema,
  objectiveQuizActivitySchema,
  readingActivitySchema,
  retrievalActivitySchema,
  speakingActivitySchema,
  vocabularyActivitySchema,
  writingActivitySchema,
]);

export const lessonManifestSchema = z.object({
  activities: z.array(activityManifestSchema).min(1).max(20),
  estimatedMinutes: z.number().int().min(5).max(90),
  lessonId: contentIdentifierSchema,
  sequence: z.number().int().min(1).max(200),
  summaryVietnamese: z.string().min(1).max(2_000),
  titleVietnamese: z.string().min(1).max(240),
});

export const unitManifestSchema = z.object({
  lessons: z.array(lessonManifestSchema).min(1).max(20),
  sequence: z.number().int().min(1).max(100),
  titleVietnamese: z.string().min(1).max(240),
  unitId: contentIdentifierSchema,
});

export const contentReleaseManifestSchema = z
  .object({
    contentReleaseId: contentIdentifierSchema,
    languageCode: z.enum(languagePackCodes),
    levelCode: z.string().min(1).max(32),
    objectiveKey: z.enum(learningObjectiveKeys),
    provenance: contentProvenanceSchema,
    releaseStatus: z.enum(contentReleaseStatuses),
    titleVietnamese: z.string().min(1).max(240),
    units: z.array(unitManifestSchema).min(1).max(20),
    version: z.string().regex(/^v\d+\.\d+\.\d+$/u),
  })
  .superRefine((manifest, context) => {
    const itemIds = manifest.units.flatMap((unit) => [
      unit.unitId,
      ...unit.lessons.flatMap((lesson) => [
        lesson.lessonId,
        ...lesson.activities.map((activity) => activity.activityId),
      ]),
    ]);

    if (new Set(itemIds).size !== itemIds.length) {
      context.addIssue({
        code: 'custom',
        message: 'Content item IDs must be unique within a release.',
      });
    }

    if (
      manifest.releaseStatus === 'published' &&
      manifest.units.some((unit) =>
        unit.lessons.some((lesson) =>
          lesson.activities.some(
            (activity) =>
              activity.status !== 'published' || activity.provenance.reviewerName === null,
          ),
        ),
      )
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Published releases require reviewed, published activities.',
      });
    }
  });

export type ActivityManifest = z.infer<typeof activityManifestSchema>;
export type ContentReleaseManifest = z.infer<typeof contentReleaseManifestSchema>;
