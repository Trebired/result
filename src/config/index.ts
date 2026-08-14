export {
  defineConfig,
  mergeResponderOptions,
  mergeTracingOptions,
  normalizeConfig,
} from "./normalize.js";
export {
  RESULT_PROJECT_CONFIG_PATH,
  findConfig,
  findConfigSync,
  loadCachedConfigSync,
  loadConfig,
  loadConfigSync,
  resetConfigCacheForTests,
} from "./load.js";

export type {
  LoadResultConfigOptions,
  LoadedResultConfig,
  NormalizedResultConfig,
  ResultConfig,
  ResultResponderConfigDefaults,
  ResultTracingConfigurableOptions,
} from "./types.js";
