import Constants from 'expo-constants';

type Flags = {
  training: boolean;
  records: boolean;
  stats: boolean;
  ice: boolean;
  readiness: boolean;
  debugData: boolean;
};

const extra = (Constants.expoConfig?.extra || {}) as any;

export const features: Flags = {
  training: extra.features?.training ?? true,
  records: extra.features?.records ?? true,
  stats: extra.features?.stats ?? true,
  ice: extra.features?.ice ?? true,
  readiness: extra.features?.readiness ?? true,
  debugData: extra.features?.debugData ?? __DEV__,
};
