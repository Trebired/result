import type {
  NormalizedResultConfig,
  ResultConfig,
  ResultResponderConfigDefaults,
  ResultTracingConfigurableOptions,
} from "./types.js";

function defineConfig<TConfig extends ResultConfig>(config: TConfig): TConfig {
  return config;
}

function normalizeConfig(config: ResultConfig = {}): NormalizedResultConfig {
  if (!isRecord(config)) {
    throw new Error("result config must be an object");
  }

  return {
    responder: normalizeResponder(config.responder),
    tracing: normalizeTracing(config.tracing),
  };
}

function mergeResponderOptions<TOptions extends ResultResponderConfigDefaults>(
  defaults: ResultResponderConfigDefaults,
  options: TOptions = {} as TOptions,
): TOptions {
  return {
    ...defaults,
    ...options,
    meta: mergeObjects(defaults.meta, options.meta),
  } as TOptions;
}

function mergeTracingOptions<TOptions extends ResultTracingConfigurableOptions>(
  defaults: ResultTracingConfigurableOptions,
  options: TOptions = {} as TOptions,
): TOptions {
  return {
    ...defaults,
    ...options,
    argumentPreview: mergeObjects(defaults.argumentPreview, options.argumentPreview),
    summaryPreview: mergeObjects(defaults.summaryPreview, options.summaryPreview),
  } as TOptions;
}

function normalizeResponder(input: ResultConfig["responder"]): ResultResponderConfigDefaults {
  if (!isRecord(input)) return {};
  return pickDefined({
      details: input.details,
      meta: isRecord(input.meta) ? input.meta : undefined,
      render: input.render,
      title: normalizeString(input.title),
      type: normalizeString(input.type),
      view: normalizeString(input.view),
  });
}

function normalizeTracing(input: ResultConfig["tracing"]): ResultTracingConfigurableOptions {
  if (!isRecord(input)) return {};
  return {
    ...input,
    argumentPreview: isRecord(input.argumentPreview) ? input.argumentPreview : undefined,
    summaryPreview: isRecord(input.summaryPreview) ? input.summaryPreview : undefined,
  };
}

function mergeObjects<TValue extends object>(left: TValue | undefined, right: TValue | undefined): TValue | undefined {
  if (!left && !right) return undefined;
  return {
    ...(left || {}),
    ...(right || {}),
  } as TValue;
}

function normalizeString(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function pickDefined<TValue extends Record<string, unknown>>(input: TValue): Partial<TValue> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<TValue>;
}

export {
  defineConfig,
  mergeResponderOptions,
  mergeTracingOptions,
  normalizeConfig,
};
