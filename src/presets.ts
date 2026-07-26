import {
  defaultResultMessage,
  defaultResultStatus,
  defaultResultTitle,
  isObject,
  mergeMetadata,
  toResultStatus,
  typeHierarchy,
} from "#shared";
import type {
  ResolveResultPresetInput,
  ResultLevel,
  ResultMetadata,
  ResultPreset,
  ResultPresetGroup,
  ResultPresetMap,
} from "#types";

const DEFAULT_RESULT_PRESETS: ResultPresetMap = {
  ok: {
    default: {
      status: 200,
      title: "Success",
      message: "The request completed successfully.",
    },
  },
  noop: {
    default: {
      status: 200,
      title: "No changes",
      message: "No changes were needed.",
    },
  },
  error: {
    default: {
      status: 500,
      title: "Oops..",
      message: "Something went wrong.",
    },
    statuses: {
      "400": {
        status: 400,
        title: "Bad request",
        message: "The request could not be completed.",
      },
      "401": {
        status: 401,
        title: "Unauthorized",
        message: "You must sign in to continue.",
      },
      "403": {
        status: 403,
        title: "Forbidden",
        message: "You do not have access to this resource.",
      },
      "404": {
        status: 404,
        title: "Not Found",
        message: "The requested resource does not exist.",
      },
      "409": {
        status: 409,
        title: "Conflict",
        message: "The request conflicts with the current resource state.",
      },
      "422": {
        status: 422,
        title: "Unprocessable Entity",
        message: "The request data could not be processed.",
      },
      "429": {
        status: 429,
        title: "Too Many Requests",
        message: "Too many requests.",
      },
      "502": {
        status: 502,
        title: "Bad Gateway",
        message: "The upstream service returned an invalid response.",
      },
      "503": {
        status: 503,
        title: "Service Unavailable",
        message: "The service is temporarily unavailable.",
      },
      "504": {
        status: 504,
        title: "Gateway Timeout",
        message: "The upstream service did not respond in time.",
      },
    },
  },
};

function mergeResultPresets<TType extends string = string>(
  base: ResultPresetMap<TType> | null | undefined,
  override: ResultPresetMap<TType> | null | undefined,
): ResultPresetMap<TType> {
  const levels: ResultLevel[] = ["ok", "noop", "error"];
  const out: ResultPresetMap<TType> = {};

  for (const level of levels) {
    const merged = mergePresetGroup(base?.[level], override?.[level]);

    if (merged) {
      out[level] = merged;
    }
  }

  return out;
}

function resolveResultPreset<TType extends string = string>({
  presets,
  level,
  status,
  type,
}: ResolveResultPresetInput<TType>): ResultPreset {
  const merged = mergeResultPresets(DEFAULT_RESULT_PRESETS, presets);
  const group = merged[level];
  const resolvedStatus = toResultStatus(status, defaultResultStatus(level));
  const fallback = createFallbackPreset(level, resolvedStatus);
  const resolved = group
    ? resolvePresetFromGroup(group, resolvedStatus, type)
    : {};

  return mergePresetEntries(fallback, resolved);
}

function mergePresetGroup<TType extends string = string>(
  base: ResultPresetGroup<TType> | undefined,
  override: ResultPresetGroup<TType> | undefined,
): ResultPresetGroup<TType> | undefined {
  if (!base && !override) {
    return undefined;
  }

  const baseTypes = base?.types || {};
  const overrideTypes = override?.types || {};
  const typeKeys = new Set([
    ...Object.keys(baseTypes),
    ...Object.keys(overrideTypes),
  ]);
  const types = Object.fromEntries(
    Array.from(typeKeys)
      .map((key) => [key, mergePresetGroup(baseTypes[key], overrideTypes[key])])
      .filter((entry) => Boolean(entry[1])),
  );

  const statuses = {
    ...(base?.statuses || {}),
    ...(override?.statuses || {}),
  };

  const out: ResultPresetGroup<TType> = {};

  const mergedDefault = mergePresetEntries(base?.default, override?.default);
  if (Object.keys(mergedDefault).length > 0) {
    out.default = mergedDefault;
  }

  if (Object.keys(statuses).length > 0) {
    out.statuses = statuses;
  }

  if (Object.keys(types).length > 0) {
    out.types = types;
  }

  return out;
}

function resolvePresetFromGroup<TType extends string = string>(
  group: ResultPresetGroup<TType>,
  status: number,
  type: TType | null | undefined,
): ResultPreset {
  let resolved = mergePresetEntries(group.default, readStatusPreset(group.statuses, status));

  for (const candidate of typeHierarchy(type)) {
    const typeGroup = group.types?.[candidate];

    if (!typeGroup) {
      continue;
    }

    resolved = mergePresetEntries(
      resolved,
      typeGroup.default,
      readStatusPreset(typeGroup.statuses, status),
    );
  }

  return resolved;
}

function readStatusPreset(statuses: ResultPresetGroup["statuses"], status: number): ResultPreset | undefined {
  if (!statuses) {
    return undefined;
  }

  return statuses[String(status)];
}

function createFallbackPreset(level: ResultLevel, status: number): ResultPreset {
  return {
    status,
    title: defaultResultTitle(level, status),
    message: defaultResultMessage(level, status),
  };
}

function mergePresetEntries(...items: Array<ResultPreset | undefined>): ResultPreset {
  const out: ResultPreset = {};
  let mergedMeta: ResultMetadata | null = null;

  for (const item of items) {
    if (!item) {
      continue;
    }

    if (typeof item.status === "number") {
      out.status = item.status;
    }

    if (typeof item.title === "string") {
      out.title = item.title;
    }

    if (typeof item.message === "string") {
      out.message = item.message;
    }

    if (typeof item.view === "string") {
      out.view = item.view;
    }

    if (isObject(item.meta)) {
      mergedMeta = mergeMetadata(mergedMeta, item.meta);
    }
  }

  if (mergedMeta && Object.keys(mergedMeta).length > 0) {
    out.meta = mergedMeta;
  }

  return out;
}

export {
  DEFAULT_RESULT_PRESETS,
  mergeResultPresets,
  resolveResultPreset,
};
