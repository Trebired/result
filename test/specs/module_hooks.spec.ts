import { expect, test } from "bun:test";

import { result } from "#index";
import { createFakeModule, createObservedTracer } from "./helpers.js";

test("instruments loaded module exports through the wrapper system", () => {
  const fakeModule = createFakeModule({
    worker() {
      return {
        fail() {
          return result.conflict("module-failed", "Module failed.");
        },
        nested: {
          explode() {
            throw new Error("module boom");
          },
        },
      };
    },
  });
  const { records, tracer } = createObservedTracer();

  tracer.installModuleHooks({
    module: fakeModule,
    labelPrefix: "fixture",
    include: "worker",
  });

  const loaded = fakeModule._load("worker") as Record<string, any>;
  loaded.fail();
  expect(() => loaded.nested.explode()).toThrow("module boom");

  expect(records).toHaveLength(2);
  expect(records[0]?.kind).toBe("result");
  expect(records[1]?.kind).toBe("throw");
  expect(records[0]?.label).toContain("worker");
});

test("deduplicates repeated module load failures and repeated installations", () => {
  const fakeModule = createFakeModule({
    missing() {
      throw new Error("missing dependency");
    },
  });
  const { records, tracer } = createObservedTracer();
  const first = tracer.installModuleHooks({
    module: fakeModule,
  });
  const second = tracer.installModuleHooks({
    module: fakeModule,
  });

  expect(() => fakeModule._load("missing")).toThrow("missing dependency");
  expect(() => fakeModule._load("missing")).toThrow("missing dependency");

  expect(first.installed).toBe(true);
  expect(second.installed).toBe(false);
  expect(records).toHaveLength(1);
  expect(records[0]).toMatchObject({
    kind: "module-load",
    source: "/virtual/missing.js",
  });
});
