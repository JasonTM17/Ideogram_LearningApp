import {
  createNativeApiClient,
  type NativeApiFetch,
  type NativeApiSessionProvider,
} from '@ideogram/api-client/native';

import { readNativeLearningApiConfiguration } from './native-learning-api-configuration';

const nativeFetch: NativeApiFetch = async (url, init) => {
  const response = await fetch(url, init);

  return {
    headers: response.headers,
    json: () => response.json(),
    status: response.status,
  };
};

export const createMobileNativeLearningApiClient = (sessionProvider: NativeApiSessionProvider) => {
  const configuration = readNativeLearningApiConfiguration();

  return createNativeApiClient({
    allowHttpLoopback: configuration.allowHttpLoopback,
    apiOrigin: configuration.apiOrigin,
    fetch: nativeFetch,
    sessionProvider,
  });
};
