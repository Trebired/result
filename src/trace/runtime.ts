import { AsyncLocalStorage } from "node:async_hooks";

import { resolveLogger } from "#9u38bvr71ysb";
import { mergeMetadata } from "#shared";
import type {
  ResultTraceConfig,
  ResultTraceRecord,
  ResultTracer,
} from "./types.js";

const RESULT_TRACER_RUNTIME_SYMBOL = Symbol.for("@package/result/runtime");

const DEFAULT_TRACE_CONFIG = {
  enabled: true,
  failedResultSeverity: "error" as const,
  objectDepth: 3,
  stackDepth: 8,
};

function createResultTraceRuntime(config: ResultTraceConfig = {}) {
  const resolved = resolveTraceConfig(config);
  const state = createRuntimeState(resolved);
  const logger = resolveLogger(resolved.logger, resolved.loggerAdapter);

  return {
    ...state,
    emit(record: ResultTraceRecord) {
      if (resolved.enabled !== true) {
        return null;
      }

      emitTraceRecord(logger, record);
      runTraceSideEffect(() => resolved.onTrace?.(record));
      return record;
    },
    getTraceStack() {
      return [...(state.storage.getStore() || [])];
    },
    runWithTraceStack<T>(stack: string[], callback: () => T): T {
      return state.storage.run([...stack], callback);
    },
    withTraceLabel<T>(label: string, callback: () => T): T {
      return state.storage.run([...this.getTraceStack(), label], callback);
    },
    markTraced(value: unknown) {
      if (value == null || typeof value !== "object") {
        return false;
      }

      if (state.tracedObjects.has(value)) {
        return true;
      }

      state.tracedObjects.add(value);
      return false;
    },
    resetForTests() {
      resetRuntimeState(state);
    },
  };
}

function resolveTraceConfig(config: ResultTraceConfig) {
  return {
    ...DEFAULT_TRACE_CONFIG,
    ...config,
    argumentPreview: {
      maxDepth: 2,
      maxItems: 5,
      maxStringLength: 120,
      ...(config.argumentPreview || {}),
    },
    summaryPreview: {
      maxDepth: 2,
      maxItems: 5,
      maxStringLength: 120,
      ...(config.summaryPreview || {}),
    },
  };
}

function createRuntimeState(config: ReturnType<typeof resolveTraceConfig>) {
  return {
    config,
    storage: new AsyncLocalStorage<string[]>(),
    functionCache: new WeakMap<Function, Map<string, Function>>(),
    promiseCache: new WeakMap<Promise<unknown>, Map<string, Promise<unknown>>>(),
    objectCache: new WeakMap<object, Map<string, unknown>>(),
    tracedObjects: new WeakSet<object>(),
    processHooks: new Map<object, { installed: boolean; uninstall(): void }>(),
    moduleHooks: new Map<object, { installed: boolean; uninstall(): void }>(),
    moduleFailureKeys: new Set<string>(),
  };
}

function resetRuntimeState(state: ReturnType<typeof createRuntimeState>) {
  for (const installation of state.processHooks.values()) {
    installation.uninstall();
  }

  for (const installation of state.moduleHooks.values()) {
    installation.uninstall();
  }

  state.tracedObjects = new WeakSet<object>();
  state.functionCache = new WeakMap<Function, Map<string, Function>>();
  state.promiseCache = new WeakMap<Promise<unknown>, Map<string, Promise<unknown>>>();
  state.objectCache = new WeakMap<object, Map<string, unknown>>();
  state.processHooks = new Map<object, { installed: boolean; uninstall(): void }>();
  state.moduleHooks = new Map<object, { installed: boolean; uninstall(): void }>();
  state.moduleFailureKeys.clear();
}

function readTracerRuntime(tracer?: ResultTracer): ReturnType<typeof createResultTraceRuntime> | null {
  const runtime = tracer
    ? (tracer as unknown as Record<PropertyKey, unknown>)[RESULT_TRACER_RUNTIME_SYMBOL]
    : null;
  return (runtime || null) as ReturnType<typeof createResultTraceRuntime> | null;
}

function getCachedEntry<TKey extends object, TValue>(
  cache: WeakMap<TKey, Map<string, TValue>>,
  key: TKey,
  cacheKey: string,
): TValue | undefined {
  return cache.get(key)?.get(cacheKey);
}

function setCachedEntry<TKey extends object, TValue>(
  cache: WeakMap<TKey, Map<string, TValue>>,
  key: TKey,
  cacheKey: string,
  value: TValue,
): TValue {
  const current = cache.get(key) || new Map<string, TValue>();
  current.set(cacheKey, value);
  cache.set(key, current);
  return value;
}

function buildTraceMeta(record: ResultTraceRecord) {
  return mergeMetadata({
    kind: record.kind,
    label: record.label,
    error_code: record.errorCode,
    status: record.status,
    failure_site: record.failureSite,
    trace_stack: record.traceStack,
    argument_preview: record.argumentPreview,
    metadata_summary: record.metadataSummary,
    data_summary: record.dataSummary,
    details_summary: record.detailsSummary,
    source: record.source,
    compact_stack: record.compactStack,
  });
}

function emitTraceRecord(
  logger: ReturnType<typeof resolveLogger>,
  record: ResultTraceRecord,
) {
  if (!logger) {
    return;
  }

  runTraceSideEffect(() => selectTraceMethod(logger, record.severity)(
    "package.result.trace",
    record.message,
    buildTraceMeta(record),
  ));
}

function runTraceSideEffect(effect: () => unknown) {
  try {
    const output = effect();

    if (output && typeof (output as PromiseLike<unknown>).then === "function") {
      Promise.resolve(output).catch(() => {});
    }
  } catch {}
}

function selectTraceMethod(
  logger: NonNullable<ReturnType<typeof resolveLogger>>,
  severity: ResultTraceRecord["severity"],
) {
  if (severity === "error") {
    return logger.error;
  }

  if (severity === "warn") {
    return logger.warn;
  }

  return logger.info;
}

export {
  RESULT_TRACER_RUNTIME_SYMBOL,
  createResultTraceRuntime,
  getCachedEntry,
  readTracerRuntime,
  setCachedEntry,
};
