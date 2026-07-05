import { createResultTracer } from "#index";
import type {
  ResultNodeModuleLike,
  ResultTraceConfig,
  ResultTraceRecord,
} from "#types";

function createObservedTracer(config: ResultTraceConfig = {}) {
  const records: ResultTraceRecord[] = [];
  const tracer = createResultTracer({
    ...config,
    onTrace(record) {
      records.push(record);
    },
  });

  return {
    tracer,
    records,
  };
}

function createFakeProcess() {
  const listeners = new Map<string, Array<(...args: any[]) => void>>();
  const exits: number[] = [];

  return {
    exits,
    on(event: string, listener: (...args: any[]) => void) {
      listeners.set(event, [...(listeners.get(event) || []), listener]);
    },
    off(event: string, listener: (...args: any[]) => void) {
      listeners.set(event, (listeners.get(event) || []).filter((entry) => entry !== listener));
    },
    emit(event: string, ...args: unknown[]) {
      for (const listener of listeners.get(event) || []) {
        listener(...args);
      }
    },
    exit(code = 0) {
      exits.push(code);
    },
  };
}

function createFakeModule(loaders: Record<string, () => unknown>): ResultNodeModuleLike {
  return {
    _resolveFilename(request: string) {
      return `/virtual/${request}.js`;
    },
    _load(request: string) {
      const loader = loaders[request];

      if (!loader) {
        throw new Error(`Missing loader for ${request}`);
      }

      return loader();
    },
  };
}

export {
  createFakeModule,
  createFakeProcess,
  createObservedTracer,
};
