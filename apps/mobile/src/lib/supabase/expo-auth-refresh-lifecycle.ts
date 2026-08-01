import { AppState } from 'react-native';

import { NativeAuthRefreshController } from './native-auth-refresh-controller';

import type { SupabaseClient } from '@supabase/supabase-js';

export const startExpoAuthRefreshLifecycle = (
  client: Pick<SupabaseClient, 'auth'>,
): NativeAuthRefreshController => {
  const controller = new NativeAuthRefreshController(
    {
      startAutoRefresh: () => client.auth.startAutoRefresh(),
      stopAutoRefresh: () => client.auth.stopAutoRefresh(),
    },
    {
      currentState: AppState.currentState,
      subscribe: (listener) => AppState.addEventListener('change', listener),
    },
    {
      onError: () => {
        console.error('Native authentication refresh lifecycle transition failed.');
      },
    },
  );
  controller.start();
  return controller;
};
