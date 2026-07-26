import {
  defaultResultTitle,
  defaultTextFallback,
  extractResultExtras,
  formatErrorMessage,
  getResultLevel,
  hasOwn,
  isObject,
  mergeMetadata,
  normalizeResultStatusCode,
  normalizeResultLike,
  toResultStatus,
} from "#shared";
import type {
  NormalizedResultLogger,
  ResultI18nBundle,
  ResultLike,
  ResultMetadata,
  ResultPayload,
  ResultRenderModel,
  ResultResponderConfig,
  ResultRespondOptions,
} from "#types";
import { buildPackageLogGroup } from "./package-metadata.js";

const FALLBACK_ERROR_STATUS_CODES: Record<number, string> = {
  400: "bad-request",
  401: "unauthorized",
  403: "forbidden",
  404: "not-found",
  409: "conflict",
  422: "unprocessable-entity",
  429: "too-many-requests",
  502: "bad-gateway",
  503: "unavailable",
  504: "gateway-timeout",
};
const RESULT_RESPONDER_LOG_GROUP = buildPackageLogGroup("responder");

function shapeResultPayload<Ctx = unknown, TType extends string = string>(
  resultLike: ResultLike | null | undefined,
  config: ResultResponderConfig<Ctx, TType>,
  context: Ctx,
  options: ResultRespondOptions<TType> = {},
): ResultPayload {
  const result = normalizeResultLike(resultLike);
  const level = getResultLevel(result);
  const status = toResultStatus(result.status, level === "error" ? 400 : 200);
  const meta = mergeMetadata(isObject(result.meta) ? result.meta : null, options.meta);
  const payload: ResultPayload = {
    ok: level !== "error",
    error: level === "error" ? result.error !== false : false,
    noop: level === "noop",
    status,
    status_code: resolveStatusCode(level, status, result),
    message: resolveLocalizedMessage(result, config, context, options, meta),
    data: hasOwn(result, "data") ? (result.data ?? null) : null,
  };

  if (hasOwn(result, "details") && result.details !== undefined) {
    payload.details = result.details;
  }

  if (typeof result.redirect === "string" && result.redirect.length > 0) {
    payload.redirect = result.redirect;
  }

  if (Object.keys(meta).length > 0) {
    payload.meta = meta;
  }

  Object.assign(payload, extractResultExtras(result));
  return payload;
}

function buildRenderModel<TType extends string = string>(
  payload: ResultPayload,
  options: ResultRespondOptions<TType> = {},
): ResultRenderModel<TType> {
  const level = getResultLevel(payload);
  const type = (options.type || "") as TType | "";
  const title = resolveTitle(level, payload.status, options);

  return {
    level,
    status: payload.status,
    status_code: payload.status_code,
    type,
    title,
    message: payload.message,
    view: resolveView(options),
    details: hasOwn(payload, "details") ? payload.details : options.details,
    meta: mergeMetadata(isObject(payload.meta) ? payload.meta : null, options.meta),
    redirect: typeof payload.redirect === "string" && payload.redirect.length > 0 ? payload.redirect : null,
    payload,
  };
}

function resolveLocalizedMessage<Ctx = unknown, TType extends string = string>(
  result: ResultLike,
  config: ResultResponderConfig<Ctx, TType>,
  context: Ctx,
  options: ResultRespondOptions<TType>,
  meta: ResultMetadata,
): string | null {
  if (result.message !== true) {
    return null;
  }

  return translateMessage(resolveStatusCode(getResultLevel(result), result.status, result), {
    bundle: options.i18n,
    language: config.getLanguage?.(context),
    variables: meta,
  });
}

function translateMessage(
  key: string,
  options: {
    bundle?: Record<string, ResultI18nBundle | undefined>;
    language?: string | null | undefined;
    variables?: ResultMetadata;
  },
): string {
  const template = lookupLocalizedTemplate(key, options.bundle, options.language);
  return interpolateMessage(template || key, options.variables || {});
}

function lookupLocalizedTemplate(
  key: string,
  bundle: Record<string, ResultI18nBundle | undefined> | undefined,
  language: string | null | undefined,
): string {
  if (!bundle) {
    return "";
  }

  for (const candidate of languageCandidates(language)) {
    const value = lookupBundleValue(bundle[candidate], key);

    if (typeof value === "string") {
      return value;
    }
  }

  return "";
}

function languageCandidates(language: string | null | undefined): string[] {
  const normalized = typeof language === "string" ? language.trim().toLowerCase().replace(/_/gu, "-") : "";
  const candidates = [];

  if (normalized) {
    candidates.push(normalized);
    const base = normalized.split("-")[0];

    if (base && base !== normalized) {
      candidates.push(base);
    }
  }

  candidates.push("en");
  return Array.from(new Set(candidates));
}

function lookupBundleValue(bundle: ResultI18nBundle | undefined, key: string): unknown {
  let current: unknown = bundle;

  for (const segment of key.split(".")) {
    if (!segment || !isObject(current)) {
      return undefined;
    }

    current = current[segment];
  }

  return current;
}

function interpolateMessage(template: string, variables: ResultMetadata): string {
  return template.replace(/\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}|\{([A-Za-z0-9_.-]+)\}/gu, (match, doubleKey, singleKey) => {
    const value = lookupVariable(variables, doubleKey || singleKey);
    return value == null ? match : String(value);
  });
}

function lookupVariable(variables: ResultMetadata, key: string): unknown {
  let current: unknown = variables;

  for (const segment of key.split(".")) {
    if (!segment || !isObject(current)) {
      return undefined;
    }

    current = current[segment];
  }

  return current;
}

function resolveStatusCode(level: "ok" | "noop" | "error", status: number, result: ResultLike): string {
  const normalized = normalizeResultStatusCode(result.status_code);

  if (normalized) {
    return normalized;
  }

  if (level === "noop") {
    return "noop";
  }

  if (level === "ok") {
    return "success";
  }

  if (status >= 500) {
    return FALLBACK_ERROR_STATUS_CODES[status] || "internal-error";
  }

  return FALLBACK_ERROR_STATUS_CODES[status] || "failed";
}

function resolveTitle<TType extends string>(
  level: "ok" | "noop" | "error",
  status: number,
  options: ResultRespondOptions<TType>,
): string {
  if (typeof options.title === "string" && options.title.trim()) {
    return options.title;
  }

  return defaultResultTitle(level, status);
}

function resolveView<TType extends string>(options: ResultRespondOptions<TType>): string | null {
  return typeof options.view === "string" && options.view.trim() ? options.view : null;
}

function resolvePayloadText<TType extends string = string>(
  payload: ResultPayload,
  options: ResultRespondOptions<TType> = {},
): string {
  if (payload.message) {
    return payload.message;
  }

  const model = buildRenderModel(payload, options);
  return defaultTextFallback(model.level, model.status, model.title);
}

function handleRenderFailure<Ctx = unknown, TType extends string = string>(
  config: ResultResponderConfig<Ctx, TType>,
  logger: NormalizedResultLogger | null,
  context: Ctx,
  model: ResultRenderModel<TType>,
  error: unknown,
) {
  logger?.error(RESULT_RESPONDER_LOG_GROUP, "render-failed", {
    level: model.level,
    status: model.status,
    type: model.type || null,
    view: model.view,
    error: formatErrorMessage(error),
    ...model.meta,
  });

  return config.sendText(context, model.status, defaultTextFallback(model.level, model.status, model.title));
}

export {
  buildRenderModel,
  handleRenderFailure,
  interpolateMessage,
  resolvePayloadText,
  shapeResultPayload,
  translateMessage,
};
