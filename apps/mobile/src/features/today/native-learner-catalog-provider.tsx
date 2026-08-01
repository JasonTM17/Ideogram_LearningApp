import { createContext, useContext } from 'react';

import { useManagedNativeLearnerCatalog } from './native-learner-catalog';

import type { ReactNode } from 'react';

type NativeLearnerCatalog = ReturnType<typeof useManagedNativeLearnerCatalog>;

const NativeLearnerCatalogContext = createContext<NativeLearnerCatalog | null>(null);

export const NativeLearnerCatalogProvider = ({ children }: { children: ReactNode }) => {
  const catalog = useManagedNativeLearnerCatalog();

  return (
    <NativeLearnerCatalogContext.Provider value={catalog}>
      {children}
    </NativeLearnerCatalogContext.Provider>
  );
};

export const useNativeLearnerCatalog = (): NativeLearnerCatalog => {
  const catalog = useContext(NativeLearnerCatalogContext);

  if (!catalog) {
    throw new Error('useNativeLearnerCatalog must be used within NativeLearnerCatalogProvider.');
  }

  return catalog;
};
