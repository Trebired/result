import { expect, test } from "bun:test";

import {
  bootResultTracing,
  createResultTracer,
  result,
} from "#index";
import { createFakeModule, createFakeProcess, createObservedTracer } from "./helpers.js";

test("traces failed result payloads with configurable severity", () => {
  const { records, tracer } = createObservedTracer({
    failedResultSeverity: "warn",
  });

  const record = tracer.traceFailure(result.notFound("missing-project", "Project missing."), {
    label: "projects.read",
  });

  expect(record).toMatchObject({
    kind: "result",
    severity: "warn",
    label: "projects.read",
    errorCode: "missing-project",
    status: 404,
  });
  expect(records).toHaveLength(1);
});

test("keeps tracing opt-in when disabled", () => {
  const tracer = createResultTracer({
    enabled: false,
  });

  const record = tracer.traceError(new Error("hidden"), {
    label: "disabled.case",
  });

  expect(record).toBeNull();
});

test("adapts object-style loggers to trace records", () => {
  const calls: Array<Record<string, unknown>> = [];
  const tracer = createResultTracer({
    logger: {
      error(scope: string, message: string, meta?: unknown) {
        calls.push({
          scope,
          message,
          meta,
        });
      },
      fail() {},
    },
  });

  tracer.traceError(new Error("boom"), {
    label: "task.run",
  });

  expect(calls[0]).toMatchObject({
    scope: "result.trace",
    message: "boom",
  });
  expect(calls[0]?.meta).toMatchObject({
    kind: "throw",
    label: "task.run",
  });
});

test("routes logger output through loggerAdapter writers", () => {
  const rows: Array<Record<string, unknown>> = [];
  const tracer = createResultTracer({
    logger: {
      rows,
    },
    loggerAdapter(logger, event) {
      ((logger as { rows: Array<Record<string, unknown>> }).rows).push({
        group: event.group,
        level: event.level,
        message: event.message,
        metadata: event.metadata,
      });
    },
  });

  tracer.traceError(new Error("adapter boom"), {
    label: "task.adapter",
  });

  expect(rows[0]).toMatchObject({
    group: "result.trace",
    level: "error",
    message: "adapter boom",
  });
});

test("boots process and module hooks only when requested", () => {
  const runtime = bootResultTracing({
    logger() {},
    processHooks: {
      process: createFakeProcess(),
    },
    moduleHooks: {
      module: createFakeModule({
        ready() {
          return {
            ping() {
              return "pong";
            },
          };
        },
      }),
    },
  });

  expect(runtime.processHooks?.installed).toBe(true);
  expect(runtime.moduleHooks?.installed).toBe(true);

  runtime.tracer.resetForTests();
});
