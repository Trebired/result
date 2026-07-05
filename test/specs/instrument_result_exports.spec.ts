import { expect, test } from "bun:test";

import { result } from "#index";
import { createObservedTracer } from "./helpers.js";

test("wraps callable exports and nested plain-object methods", () => {
  const { records, tracer } = createObservedTracer();
  const marker = Symbol("marker");
  const target = {
    fail() {
      return result.notFound("missing-item", "Missing.");
    },
    nested: {
      explode() {
        throw new Error("nested boom");
      },
      deeper: {
        noop() {
          return "ready";
        },
      },
    },
    [marker]: "safe",
  };

  const instrumented = tracer.instrumentExports(target, {
    label: "pkg.worker",
    depth: 2,
  });

  instrumented.fail();
  expect(() => instrumented.nested.explode()).toThrow("nested boom");

  expect(records).toHaveLength(2);
  expect(records[0]?.label).toBe("pkg.worker.fail");
  expect(records[1]?.label).toBe("pkg.worker.nested.explode");
  expect(instrumented[marker]).toBe("safe");
  expect(instrumented.nested.deeper.noop()).toBe("ready");
});

test("reuses proxies and respects include and exclude filters", () => {
  const { records, tracer } = createObservedTracer();
  const target = {
    allowed() {
      return result.conflict("blocked", "Blocked.");
    },
    skipped() {
      return result.conflict("ignored", "Ignored.");
    },
  };

  const first = tracer.instrumentExports(target, {
    label: "pkg.service",
    include: "allowed",
    exclude: "skipped",
  });
  const second = tracer.instrumentExports(target, {
    label: "pkg.service",
    include: "allowed",
    exclude: "skipped",
  });

  first.allowed();
  first.skipped();

  expect(first).toBe(second);
  expect(records).toHaveLength(1);
  expect(records[0]?.label).toBe("pkg.service.allowed");
});
