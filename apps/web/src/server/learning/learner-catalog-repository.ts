import { assembleLearnerCatalog } from './learner-catalog-assembler';
import { learnerCatalogRpcDataSchema } from './learner-catalog-row-contracts';

import type { LearnerCatalogResponse } from '@ideogram/contracts';
import type { SupabaseClient } from '@supabase/supabase-js';

interface SupabaseRpcResult {
  data: unknown;
  error: unknown;
}

export class LearnerCatalogRepositoryError extends Error {
  constructor() {
    super('Learner catalog data is unavailable.');
    this.name = 'LearnerCatalogRepositoryError';
  }
}

const unwrapCatalogData = (result: SupabaseRpcResult) => {
  if (result.error) {
    throw new LearnerCatalogRepositoryError();
  }

  return learnerCatalogRpcDataSchema.parse(result.data);
};

export const readLearnerCatalog = async (
  client: SupabaseClient,
): Promise<LearnerCatalogResponse> => {
  const result = await client.rpc('get_learner_catalog_data');
  const catalogData = unwrapCatalogData(result);

  return assembleLearnerCatalog({
    activities: catalogData.activities,
    languagePacks: catalogData.language_packs,
    lessons: catalogData.lessons,
    paths: catalogData.paths,
    releases: catalogData.releases,
    units: catalogData.units,
  });
};
