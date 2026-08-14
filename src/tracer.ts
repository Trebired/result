import {
  traceErrorWithRuntime,
  traceFailureWithRuntime,
  traceResultWithRuntime,
} from "./trace/capture.js";
import { instrumentResultExportsWithRuntime } from "./instrument_result_exports.js";
import { installResultModuleHooksWithRuntime } from "./module_hooks.js";
import { installResultProcessHooksWithRuntime } from "./process_hooks.js";
import { createResultTraceRuntime, RESULT_TRACER_RUNTIME_SYMBOL } from "./trace/runtime.js";
import { loadCachedConfigSync, mergeTracingOptions } from "./config/index.js";
import { wrapResultFunctionWithRuntime } from "./wrap/result/function.js";
import { wrapResultPromiseWithRuntime } from "./wrap/result/promise.js";
import type {
  BootResultTracingOptions,
  ResultHookInstallation,
  ResultTraceConfig,
  ResultTracer,
  ResultTracingBoot,
} from "./trace/types.js";

function createResultTracer(config: ResultTraceConfig = {}): ResultTracer {
  const resolvedConfig = mergeTracingOptions(loadCachedConfigSync().tracing, config);
  const runtime = createResultTraceRuntime(resolvedConfig);
  const tracer: ResultTracer = {
    config: runtime.config,
    traceFailure(failure, options) {
      return traceFailureWithRuntime(runtime, failure, options);
    },
    traceResult(result, options) {
      return traceResultWithRuntime(runtime, result, options);
    },
    traceError(error, options) {
      return traceErrorWithRuntime(runtime, error, options);
    },
    wrapFunction(fn, options) {
      return wrapResultFunctionWithRuntime(runtime, fn, options);
    },
    wrapPromise(promise, options) {
      return wrapResultPromiseWithRuntime(runtime, promise, options);
    },
    instrumentExports(target, options) {
      return instrumentResultExportsWithRuntime(runtime, target, options);
    },
    installProcessHooks(options) {
      return installResultProcessHooksWithRuntime(runtime, options);
    },
    installModuleHooks(options) {
      return installResultModuleHooksWithRuntime(runtime, options);
    },
    getTraceStack() {
      return runtime.getTraceStack();
    },
    resetForTests() {
      runtime.resetForTests();
    },
  };

  Object.defineProperty(tracer, RESULT_TRACER_RUNTIME_SYMBOL, {
      value: runtime,
      enumerable: false,
  });

  return tracer;
}

function bootResultTracing(config: BootResultTracingOptions = {}): ResultTracingBoot {
  const resolvedConfig = mergeTracingOptions(loadCachedConfigSync().tracing, config);
  const tracer = createResultTracer(resolvedConfig);

  return {
    tracer,
    processHooks: resolveBootProcessHooks(tracer, resolvedConfig),
    moduleHooks: resolveBootModuleHooks(tracer, resolvedConfig),
  };
}

function resolveBootProcessHooks(
  tracer: ResultTracer,
  config: BootResultTracingOptions,
): ResultHookInstallation | null {
  if (config.processHooks === false) {
    return null;
  }

  if (!config.processHooks) {
    return null;
  }

  return tracer.installProcessHooks(config.processHooks === true ? {} : config.processHooks);
}

function resolveBootModuleHooks(
  tracer: ResultTracer,
  config: BootResultTracingOptions,
): ResultHookInstallation | null {
  if (config.moduleHooks === false) {
    return null;
  }

  if (!config.moduleHooks) {
    return null;
  }

  return tracer.installModuleHooks(config.moduleHooks === true ? {} : config.moduleHooks);
}

export {
  createResultTracer,
  bootResultTracing,
};
