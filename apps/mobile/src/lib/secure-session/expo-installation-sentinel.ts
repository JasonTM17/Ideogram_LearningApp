import { File, Paths } from 'expo-file-system';

import type { InstallationSentinelPort } from './installation-bound-session-storage';

const sentinelFileName = '.ideogram-installation-v1';

export const createExpoInstallationSentinel = (): InstallationSentinelPort => {
  const file = new File(Paths.document, sentinelFileName);

  return {
    create: async () => {
      file.create({ intermediates: true, overwrite: true });
      file.write('v1');
    },
    exists: async () => file.exists,
  };
};
