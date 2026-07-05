import { expect, test } from "bun:test";

import {
  captureCallSite,
  compactStack,
  matchTraceTarget,
  normalizeThrownValue,
  normalizeTraceLabel,
  previewCallArguments,
  result,
  summarizeFailedResult,
} from "#index";

test("summarizes failed results with normalized codes and previews", () => {
  const summary = summarizeFailedResult(result.conflict("Bad Code!", "Nope.", {
    data: {
      id: "project_42",
    },
    details: {
      changed: false,
    },
    meta: {
      requestId: "req_1",
    },
  }), {
    maxDepth: 2,
    maxItems: 4,
    maxStringLength: 40,
  }, 6);

  expect(summary.errorCode).toBe("bad-code");
  expect(summary.status).toBe(409);
  expect(summary.dataSummary).toContain("project_42");
  expect(summary.detailsSummary).toContain("changed");
  expect(summary.metadataSummary).toContain("requestId");
});

test("normalizes thrown values into trace summaries", () => {
  const summary = normalizeThrownValue({
    code: "Bad Value",
    message: "Exploded.",
    status: 422,
    details: {
      field: "name",
    },
  }, {
    maxDepth: 2,
    maxItems: 4,
    maxStringLength: 40,
  }, 6);

  expect(summary).toMatchObject({
    errorCode: "bad-value",
    status: 422,
    message: "Exploded.",
  });
  expect(summary.detailsSummary).toContain("field");
});

test("captures call sites, previews arguments, and matches trace filters", () => {
  const circular: Record<string, unknown> = {
    ok: true,
  };
  circular.self = circular;

  const preview = previewCallArguments(["hello", circular], {
    maxDepth: 2,
    maxItems: 4,
    maxStringLength: 20,
  });
  const stack = compactStack(new Error("boom"), 4);
  const site = captureCallSite(new Error("boom"), 4);

  expect(preview[0]).toBe("\"hello\"");
  expect(preview[1]).toContain("[Circular]");
  expect(stack.length).toBeGreaterThan(0);
  expect(site.site).toBeTruthy();
  expect(matchTraceTarget("app.worker.sync", [/worker/, "sync"], "skip")).toBe(true);
  expect(matchTraceTarget("app.worker.skip", "worker", /skip$/)).toBe(false);
  expect(normalizeTraceLabel("  ", "fallback.trace")).toBe("fallback.trace");
});
