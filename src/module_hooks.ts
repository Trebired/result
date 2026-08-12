import { createRequire } from "node:module";

import { instrumentResultExportsWithRuntime } from "./instrument_result_exports.js";
import { traceErrorWithRuntime } from "./trace/capture.js";
import { createResultTraceRuntime, resolveResultTraceRuntime } from "./trace/runtime.js";
import { matchTraceTarget, normalizeTraceLabel } from "./trace/utils.js";
import type {
  ResultHookInstallation,
  ResultModuleHookOptions,
  ResultNodeModuleLike,
} from "./trace/types.js";

const NodeModule = createRequire(import.meta.url)("node:module") as ResultNodeModuleLike;

function installResultModuleHooks(
  options: ResultModuleHookOptions = {},
): ResultHookInstallation {
  const runtime = resolveResultTraceRuntime(options);
  return installResultModuleHooksWithRuntime(runtime, options);
}

function installResultModuleHooksWithRuntime(
  runtime: ReturnType<typeof createResultTraceRuntime>,
  options: ResultModuleHookOptions = {},
): ResultHookInstallation {
  const target = options.module || NodeModule;
  const current = runtime.moduleHooks.get(target as object);

  if (current) {
    return {
      installed: false,
      uninstall: current.uninstall,
    };
  }

  const originalLoad = target._load;
  const patchedLoad = function patchedResultModuleLoad(this: unknown, request: string, parent?: unknown, isMain?: boolean) {
    const resolved = resolveModuleTarget(target, request, parent, isMain);

    try {
      const loaded = originalLoad.call(this, request, parent, isMain);
      if (!shouldInstrumentTarget(runtime, options, request, resolved)) {
        return loaded;
      }

      return instrumentResultExportsWithRuntime(runtime, loaded, {
          ...options,
          label: buildModuleLabel(options, resolved || request),
          depth: options.depth,
      });
    } catch (error) {
      traceModuleLoadFailure(runtime, options, request, resolved, parent, error);
      throw error;
    }
  };

  target._load = patchedLoad;

  const uninstall = () => {
    target._load = originalLoad;
    runtime.moduleHooks.delete(target as object);
  };
  const installation = {
    installed: true,
    uninstall,
  };

  runtime.moduleHooks.set(target as object, installation);
  return installation;
}

function shouldInstrumentTarget(
  runtime: ReturnType<typeof createResultTraceRuntime>,
  options: ResultModuleHookOptions,
  request: string,
  resolved: string | null,
) {
  const current = resolved || request;
  return matchTraceTarget(current, options.include || runtime.config.include, options.exclude || runtime.config.exclude);
}

function traceModuleLoadFailure(
  runtime: ReturnType<typeof createResultTraceRuntime>,
  options: ResultModuleHookOptions,
  request: string,
  resolved: string | null,
  parent: unknown,
  error: unknown,
) {
  const parentId = typeof(parent as Record<string, unknown>|null)?.filename === "string"
  ? String((parent as Record<string, unknown>).filename)
  : "";
  const dedupeKey = `${request}:${parentId}`;

  if (runtime.moduleFailureKeys.has(dedupeKey)) {
    return;
  }

  runtime.moduleFailureKeys.add(dedupeKey);
  traceErrorWithRuntime(runtime, error, {
      ...options,
      kind: "module-load",
      label: buildModuleLabel(options, request),
      source: resolved || request,
      args: parentId ? [parentId] : [],
  });
}

function buildModuleLabel(options: ResultModuleHookOptions, input: string): string {
  const prefix = normalizeTraceLabel(options.labelPrefix, "module");
  return `${prefix}.${normalizeTraceLabel(input, "load")}`;
}

function resolveModuleTarget(
  target: ResultNodeModuleLike,
  request: string,
  parent?: unknown,
  isMain?: boolean,
): string | null {
  try {
    return typeof target._resolveFilename === "function"
    ? String(target._resolveFilename(request, parent, isMain))
    : null;
  } catch {
    return null;
  }
}

export {
  installResultModuleHooks,
  installResultModuleHooksWithRuntime,
};
