import { traceErrorWithRuntime, traceResultWithRuntime } from "#ovyuo31bgsj9";
import { createResultTraceRuntime, getCachedEntry, readTracerRuntime, setCachedEntry } from "#0231fmpa2dc7";
import { normalizeTraceLabel } from "#ypczi4qi4ap6";
import { isPromiseLike } from "#shared";
import type { WrapResultFunctionOptions } from "#qsb8x4t06m0e";
import { wrapResultPromiseWithRuntime } from "./promise.js";

const ORIGINAL_FUNCTION_SYMBOL = Symbol.for("@trebired/result/original-function");

function wrapResultFunction<Fn extends (...args: any[]) => any>(
  fn: Fn,
  options: WrapResultFunctionOptions = {},
): Fn {
  const runtime = readTracerRuntime(options.tracer) || createResultTraceRuntime(options);
  return wrapResultFunctionWithRuntime(runtime, fn, options);
}

function wrapResultFunctionWithRuntime<Fn extends (...args: any[]) => any>(
  runtime: ReturnType<typeof createResultTraceRuntime>,
  fn: Fn,
  options: WrapResultFunctionOptions = {},
): Fn {
  const original = unwrapFunction(fn);
  const label = normalizeTraceLabel(options.label || original.name, "result.function");
  const cached = getCachedEntry(runtime.functionCache, original, label);

  if (cached) {
    return cached as Fn;
  }

  const wrapped = createArityWrapper(original.length, function wrappedInvoker(this: unknown, args: unknown[]) {
    return invokeWrappedFunction(runtime, original, this, args, options, label);
  });

  Object.defineProperty(wrapped, ORIGINAL_FUNCTION_SYMBOL, {
    value: original,
    enumerable: false,
  });

  return setCachedEntry(runtime.functionCache, original, label, wrapped) as Fn;
}

function invokeWrappedFunction(
  runtime: ReturnType<typeof createResultTraceRuntime>,
  fn: (...args: any[]) => any,
  thisArg: unknown,
  args: unknown[],
  options: WrapResultFunctionOptions,
  label: string,
) {
  return runtime.withTraceLabel(label, () => {
    try {
      const output = Reflect.apply(fn, thisArg, args);
      return isPromiseLike(output)
        ? wrapResultPromiseWithRuntime(runtime, Promise.resolve(output), { ...options, args, label, source: options.source || label })
        : completeSyncTrace(runtime, output, options, args, label);
    } catch (error) {
      traceErrorWithRuntime(runtime, error, { ...options, args, label });
      throw error;
    }
  });
}

function completeSyncTrace(
  runtime: ReturnType<typeof createResultTraceRuntime>,
  output: unknown,
  options: WrapResultFunctionOptions,
  args: unknown[],
  label: string,
) {
  traceResultWithRuntime(runtime, output as any, { ...options, args, label });
  return output;
}

function createArityWrapper(
  length: number,
  invoke: (this: unknown, args: unknown[]) => unknown,
): (...args: unknown[]) => unknown {
  switch (Math.max(0, Math.min(length, 6))) {
    case 0: return function resultWrapper0(this: unknown) { return invoke.call(this, []); };
    case 1: return function resultWrapper1(this: unknown, a: unknown) { return invoke.call(this, [a]); };
    case 2: return function resultWrapper2(this: unknown, a: unknown, b: unknown) { return invoke.call(this, [a, b]); };
    case 3: return function resultWrapper3(this: unknown, a: unknown, b: unknown, c: unknown) { return invoke.call(this, [a, b, c]); };
    case 4: return function resultWrapper4(this: unknown, a: unknown, b: unknown, c: unknown, d: unknown) { return invoke.call(this, [a, b, c, d]); };
    case 5: return function resultWrapper5(this: unknown, a: unknown, b: unknown, c: unknown, d: unknown, e: unknown) { return invoke.call(this, [a, b, c, d, e]); };
    default: return function resultWrapper6(this: unknown, a: unknown, b: unknown, c: unknown, d: unknown, e: unknown, f: unknown) { return invoke.call(this, [a, b, c, d, e, f]); };
  }
}

function unwrapFunction<Fn extends (...args: any[]) => any>(fn: Fn): Fn {
  const original = (fn as unknown as Record<PropertyKey, unknown>)[ORIGINAL_FUNCTION_SYMBOL];
  return (typeof original === "function" ? original : fn) as Fn;
}

export {
  wrapResultFunction,
  wrapResultFunctionWithRuntime,
};
