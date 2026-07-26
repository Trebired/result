import { expect, test } from "bun:test";

import {
  result,
  wrapResultFunction,
  wrapResultPromise,
} from "#index";
import { createObservedTracer } from "./helpers.js";

test("preserves function arity and avoids wrapping the same function twice", () => {
  const { tracer } = createObservedTracer();
  const target = function namedTarget(a: unknown, b: unknown, c: unknown) {
    return [a, b, c];
  };

  const first = tracer.wrapFunction(target, {
    label: "math.target",
  });
  const second = wrapResultFunction(first, {
    tracer,
    label: "math.target",
  });

  expect(first.length).toBe(3);
  expect(second).toBe(first);
  expect(second(1, 2, 3)).toEqual([1, 2, 3]);
});

test("propagates nested trace stacks for thrown failures", () => {
  const { records, tracer } = createObservedTracer();
  const inner = tracer.wrapFunction(() => {
    throw new Error("boom");
  }, {
    label: "inner.step",
  });
  const outer = tracer.wrapFunction(() => inner(), {
    label: "outer.step",
  });

  expect(() => outer()).toThrow("boom");
  expect(records).toHaveLength(1);
  expect(records[0]).toMatchObject({
    kind: "throw",
    label: "inner.step",
    traceStack: ["outer.step", "inner.step"],
  });
});

test("traces failed result returns from wrapped functions", () => {
  const { records, tracer } = createObservedTracer();
  const wrapped = tracer.wrapFunction(() => result.conflict("saveBlocked"), {
    label: "project.save",
  });

  const output = wrapped();

  expect(output).toMatchObject({
    status: 409,
    error_code: "save-blocked",
  });
  expect(records[0]).toMatchObject({
    kind: "result",
    label: "project.save",
    errorCode: "save-blocked",
  });
});

test("traces rejected promises and deduplicates wrapped promises", async () => {
  const { records, tracer } = createObservedTracer();
  const pending = Promise.reject(new Error("nope"));
  const first = tracer.wrapPromise(pending, {
    label: "sync.promise",
  });
  const second = wrapResultPromise(first, {
    tracer,
    label: "sync.promise",
  });

  expect(first).toBe(second);
  await expect(first).rejects.toThrow("nope");
  expect(records[0]).toMatchObject({
    kind: "reject",
    label: "sync.promise",
    message: "nope",
  });
  expect(records[0]?.source).toBeTruthy();
});

test("traces resolved failed-result payloads from wrapped promises", async () => {
  const { records, tracer } = createObservedTracer();
  const output = await tracer.wrapPromise(Promise.resolve(result.notFound("syncMiss")), {
    label: "sync.result",
  });

  expect(output).toMatchObject({
    status: 404,
    error_code: "sync-miss",
  });
  expect(records[0]).toMatchObject({
    kind: "result",
    label: "sync.result",
    errorCode: "sync-miss",
  });
});
