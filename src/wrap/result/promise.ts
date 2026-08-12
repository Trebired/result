import { traceErrorWithRuntime, traceResultWithRuntime } from "#ovyuo31bgsj9";
import { createResultTraceRuntime, getCachedEntry, readTracerRuntime, setCachedEntry } from "#0231fmpa2dc7";
import { captureCallSite, normalizeTraceLabel } from "#ypczi4qi4ap6";
import { buildPackageLogGroup } from "#ta293zk8h1c4";
import type { WrapResultPromiseOptions } from "#qsb8x4t06m0e";

const ORIGINAL_PROMISE_SYMBOL = Symbol.for ("@package/result/original-promise");
const RESULT_PROMISE_TRACE_LABEL = buildPackageLogGroup("promise");

function wrapResultPromise<T>(
  promise: Promise<T>,
  options: WrapResultPromiseOptions = {},
): Promise<T> {
  const runtime = readTracerRuntime(options.tracer) || createResultTraceRuntime(options);
  return wrapResultPromiseWithRuntime(runtime, promise, options);
}

function wrapResultPromiseWithRuntime<T>(
  runtime: ReturnType<typeof createResultTraceRuntime>,
  promise: Promise<T>,
  options: WrapResultPromiseOptions = {},
): Promise<T> {
  const original = unwrapPromise(promise);
  const label = normalizeTraceLabel(options.label, RESULT_PROMISE_TRACE_LABEL);
  const source = options.source || captureCallSite(undefined, runtime.config.stackDepth).site;
  const cached = getCachedEntry(runtime.promiseCache, original, label);

  if (cached) {
    return cached as Promise<T>;
  }

  const traceStack = runtime.getTraceStack();
  const wrapped = Promise.resolve(original).then(
    (value) => runtime.runWithTraceStack(traceStack, () => {
        traceResultWithRuntime(runtime, value as any, {
            ...options,
            label,
            source,
        });
        return value;
    }),
    (error) => runtime.runWithTraceStack(traceStack, () => {
        traceErrorWithRuntime(runtime, error, {
            ...options,
            kind: "reject",
            label,
            source,
        });
        throw error;
    }),
  );

  Object.defineProperty(wrapped, ORIGINAL_PROMISE_SYMBOL, {
      value: original,
      enumerable: false,
  });

  return setCachedEntry(runtime.promiseCache, original, label, wrapped) as Promise<T>;
}

function unwrapPromise<T>(promise: Promise<T>): Promise<T> {
  const original = (promise as unknown as Record<PropertyKey, unknown>)[ORIGINAL_PROMISE_SYMBOL];
  return (original instanceof Promise ? original : promise) as Promise<T>;
}

export {
  wrapResultPromise,
  wrapResultPromiseWithRuntime,
};
