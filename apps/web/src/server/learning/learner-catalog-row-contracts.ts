import {
  activityTypes,
  contentIdentifierSchema,
  languagePackCodes,
  learningObjectiveKeys,
  targetScriptKinds,
} from '@ideogram/contracts';
import { z } from 'zod';

const publishedItemStatusSchema = z.literal('published');
const catalogUuidSchema = z.string().uuid();

export const languagePackCatalogRowSchema = z
  .object({
    availability_state: z.literal('active'),
    display_name_vietnamese: z.string().min(1).max(120),
    language_code: z.enum(languagePackCodes),
  })
  .strict();

export const learningPathCatalogRowSchema = z
  .object({
    language_code: z.enum(languagePackCodes),
    level_code: z.string().min(1).max(32),
    objective_key: z.enum(learningObjectiveKeys),
    path_id: catalogUuidSchema,
    path_status: publishedItemStatusSchema,
  })
  .strict();

export const contentReleaseCatalogRowSchema = z
  .object({
    content_release_id: contentIdentifierSchema,
    path_id: catalogUuidSchema,
    published_at: z.string().min(1),
    release_status: publishedItemStatusSchema,
    title_vietnamese: z.string().min(1).max(240),
    version: z.string().regex(/^v\d+\.\d+\.\d+$/u),
  })
  .strict();

export const contentUnitCatalogRowSchema = z
  .object({
    content_release_id: contentIdentifierSchema,
    sequence: z.number().int().min(1).max(100),
    status: publishedItemStatusSchema,
    title_vietnamese: z.string().min(1).max(240),
    unit_id: contentIdentifierSchema,
  })
  .strict();

export const lessonCatalogRowSchema = z
  .object({
    content_release_id: contentIdentifierSchema,
    estimated_minutes: z.number().int().min(5).max(90),
    lesson_id: contentIdentifierSchema,
    sequence: z.number().int().min(1).max(200),
    status: publishedItemStatusSchema,
    summary_vietnamese: z.string().min(1).max(2_000),
    title_vietnamese: z.string().min(1).max(240),
    unit_id: contentIdentifierSchema,
  })
  .strict();

export const learnerCatalogActivityRpcRowSchema = z
  .object({
    activity_id: contentIdentifierSchema,
    activity_type: z.enum(activityTypes),
    content_release_id: contentIdentifierSchema,
    estimated_minutes: z.number().int().min(1).max(45),
    instructions_vietnamese: z.string().min(1).max(2_000),
    lesson_id: contentIdentifierSchema,
    payload: z.unknown(),
    sequence: z.number().int().min(1).max(50),
    target_script: z.enum(targetScriptKinds),
    title_vietnamese: z.string().min(1).max(240),
  })
  .strict();

export const learnerCatalogRpcDataSchema = z
  .object({
    activities: z.array(learnerCatalogActivityRpcRowSchema),
    language_packs: z.array(languagePackCatalogRowSchema),
    lessons: z.array(lessonCatalogRowSchema),
    paths: z.array(learningPathCatalogRowSchema),
    releases: z.array(contentReleaseCatalogRowSchema),
    units: z.array(contentUnitCatalogRowSchema),
  })
  .strict();

export type LanguagePackCatalogRow = z.infer<typeof languagePackCatalogRowSchema>;
export type LearningPathCatalogRow = z.infer<typeof learningPathCatalogRowSchema>;
export type ContentReleaseCatalogRow = z.infer<typeof contentReleaseCatalogRowSchema>;
export type ContentUnitCatalogRow = z.infer<typeof contentUnitCatalogRowSchema>;
export type LessonCatalogRow = z.infer<typeof lessonCatalogRowSchema>;
export type LearnerCatalogActivityRpcRow = z.infer<typeof learnerCatalogActivityRpcRowSchema>;
export type LearnerCatalogRpcData = z.infer<typeof learnerCatalogRpcDataSchema>;
