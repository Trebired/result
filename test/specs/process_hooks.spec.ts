import { expect, test } from "bun:test";

import { createResultTracer } from "#index";
import { createFakeProcess, createObservedTracer } from "./helpers.js";

test("installs process hooks once and traces uncaught and unhandled failures", () => {
  const fakeProcess = createFakeProcess();
  const { records, tracer } = createObservedTracer();
  const first = tracer.installProcessHooks({
    process: fakeProcess,
  });
  const second = tracer.installProcessHooks({
    process: fakeProcess,
  });

  fakeProcess.emit("uncaughtException", new Error("crash"));
  fakeProcess.emit("unhandledRejection", new Error("late crash"));

  expect(first.installed).toBe(true);
  expect(second.installed).toBe(false);
  expect(records.map((record) => record.kind)).toEqual([
    "uncaught-exception",
    "unhandled-rejection",
  ]);

  first.uninstall();
});

test("applies configurable exit policies for process hooks", () => {
  const fakeProcess = createFakeProcess();
  const exits: number[] = [];
  const tracer = createResultTracer({
    logger() {},
  });

  tracer.installProcessHooks({
    process: fakeProcess,
    exitOnUncaughtException: true,
    exitOnUnhandledRejection(record) {
      exits.push(record.status || 0);
    },
  });

  fakeProcess.emit("uncaughtException", new Error("boom"));
  fakeProcess.emit("unhandledRejection", new Error("later"));

  expect(fakeProcess.exits).toEqual([1]);
  expect(exits).toEqual([0]);
});
