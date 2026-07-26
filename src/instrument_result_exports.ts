import { createResultTraceRuntime, getCachedEntry, readTracerRuntime, setCachedEntry } from "./trace/runtime.js";
import { isPlainObject, matchTraceTarget, normalizeTraceLabel } from "./trace/utils.js";
import { wrapResultFunctionWithRuntime } from "./wrap/result/function.js";
import { buildPackageLogGroup } from "./package-metadata.js";
import type {
  InstrumentResultExportsOptions,
} from "./trace/types.js";

const RESULT_EXPORTS_TRACE_LABEL = buildPackageLogGroup("exports");

function instrumentResultExports<T>(
  target: T,
  options: InstrumentResultExportsOptions = {},
): T {
  const runtime = resolveRuntime(options.tracer, options);
  return instrumentResultExportsWithRuntime(runtime, target, options);
}

function instrumentResultExportsWithRuntime<T>(
  runtime: ReturnType<typeof createResultTraceRuntime>,
  target: T,
  options: InstrumentResultExportsOptions = {},
): T {
  const label = normalizeTraceLabel(options.label, RESULT_EXPORTS_TRACE_LABEL);
  const depth = resolveDepth(runtime, options.depth);
  return instrumentValue(runtime, target, label, depth, options) as T;
}

function instrumentValue(
  runtime: ReturnType<typeof createResultTraceRuntime>,
  value: unknown,
  label: string,
  depth: number,
  options: InstrumentResultExportsOptions,
): unknown {
  if (typeof value === "function") {
    if (!matchTraceTarget(label, options.include || runtime.config.include, options.exclude || runtime.config.exclude)) {
      return value;
    }

    return wrapResultFunctionWithRuntime(runtime, value as (...args: any[]) => any, {
      ...options,
      label,
    });
  }

  if (!isPlainObject(value) || depth <= 0) {
    return value;
  }

  if (!matchTraceTarget(label, undefined, options.exclude || runtime.config.exclude)) {
    return value;
  }

  const cacheKey = `${label}:${depth}`;
  const cached = getCachedEntry(runtime.objectCache, value, cacheKey);
  if (cached) {
    return cached;
  }

  const proxy = new Proxy(value, createProxyHandler(runtime, label, depth, options));
  return setCachedEntry(runtime.objectCache, value, cacheKey, proxy);
}

function createProxyHandler(
  runtime: ReturnType<typeof createResultTraceRuntime>,
  label: string,
  depth: number,
  options: InstrumentResultExportsOptions,
): ProxyHandler<Record<string, unknown>> {
  return {
    get(target, property, receiver) {
      if (typeof property === "symbol" || property === "inspect") {
        return Reflect.get(target, property, receiver);
      }

      const nextLabel = `${label}.${String(property)}`;
      const current = Reflect.get(target, property, receiver);
      return instrumentValue(runtime, current, nextLabel, depth - 1, options);
    },
    getOwnPropertyDescriptor(target, property) {
      return Reflect.getOwnPropertyDescriptor(target, property);
    },
    ownKeys(target) {
      return Reflect.ownKeys(target);
    },
  };
}

function resolveDepth(
  runtime: ReturnType<typeof createResultTraceRuntime>,
  depth: number | undefined,
): number {
  return typeof depth === "number" ? depth : runtime.config.objectDepth;
}

function resolveRuntime(
  tracer: InstrumentResultExportsOptions["tracer"],
  options: InstrumentResultExportsOptions,
) {
  return readTracerRuntime(tracer) || createResultTraceRuntime(options);
}

export {
  instrumentResultExports,
  instrumentResultExportsWithRuntime,
};
