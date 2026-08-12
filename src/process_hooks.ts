import { traceErrorWithRuntime } from "./trace/capture.js";
import { createResultTraceRuntime, resolveResultTraceRuntime } from "./trace/runtime.js";
import type {
  ResultHookInstallation,
  ResultProcessHookOptions,
  ResultTraceProcessLike,
} from "./trace/types.js";

function installResultProcessHooks(
  options: ResultProcessHookOptions = {},
): ResultHookInstallation {
  const runtime = resolveResultTraceRuntime(options);
  return installResultProcessHooksWithRuntime(runtime, options);
}

function installResultProcessHooksWithRuntime(
  runtime: ReturnType<typeof createResultTraceRuntime>,
  options: ResultProcessHookOptions = {},
): ResultHookInstallation {
  const target = options.process || process;
  const current = runtime.processHooks.get(target as object);

  if (current) {
    return {
      installed: false,
      uninstall: current.uninstall,
    };
  }

  const uncaught = (error: unknown) => {
    const record = traceErrorWithRuntime(runtime, error, {
        ...options,
        kind: "uncaught-exception",
        label: options.label || "process.uncaughtException",
        source: "uncaughtException",
    });
    applyExitPolicy(record, target, options.exitOnUncaughtException);
  };
  const unhandled = (reason: unknown) => {
    const record = traceErrorWithRuntime(runtime, reason, {
        ...options,
        kind: "unhandled-rejection",
        label: options.label || "process.unhandledRejection",
        source: "unhandledRejection",
    });
    applyExitPolicy(record, target, options.exitOnUnhandledRejection);
  };

  target.on("uncaughtException", uncaught);
  target.on("unhandledRejection", unhandled);

  const uninstall = () => {
    removeListener(target, "uncaughtException", uncaught);
    removeListener(target, "unhandledRejection", unhandled);
    runtime.processHooks.delete(target as object);
  };
  const installation = {
    installed: true,
    uninstall,
  };

  runtime.processHooks.set(target as object, installation);
  return installation;
}

function applyExitPolicy(
  record: ReturnType<typeof traceErrorWithRuntime>,
  target: ResultTraceProcessLike,
  exitPolicy: ResultProcessHookOptions["exitOnUncaughtException"],
) {
  if (!record || !exitPolicy) {
    return;
  }

  if (typeof exitPolicy === "function") {
    exitPolicy(record, target);
    return;
  }

  target.exit?.(1);
}

function removeListener(
  target: ResultTraceProcessLike,
  event: string,
  listener: (...args: any[]) => void,
) {
  if (typeof target.off === "function") {
    target.off(event, listener);
    return;
  }

  target.removeListener?.(event, listener);
}

export {
  installResultProcessHooks,
  installResultProcessHooksWithRuntime,
};
