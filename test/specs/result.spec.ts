import { describe, expect, test } from "bun:test";

import {
  badRequest,
  conflict,
  internal,
  noop,
  ok,
  result,
} from "#index";

function registerKeyedResultTest() {
  test("builds key-first results with stable normalized codes", () => {
    expect(badRequest("missingPassword", { min: 8 })).toMatchObject({
      ok: false,
      error: true,
      noop: false,
      status: 400,
      error_code: "missing-password",
      message: "missingPassword",
      data: null,
      meta: {
        min: 8,
      },
    });

    expect(internal("writeFailed", { filePath: "/tmp/out.txt" })).toMatchObject({
      ok: false,
      error: true,
      noop: false,
      status: 500,
      error_code: "write-failed",
      message: "writeFailed",
      meta: {
        filePath: "/tmp/out.txt",
      },
    });
  });
}

function registerResultVariantTest() {
  test("builds success, noop, and conflict variants with keyed messages", () => {
    expect(ok("saved")).toMatchObject({
      ok: true,
      error: false,
      noop: false,
      status: 200,
      error_code: "",
      message: "saved",
    });

    expect(noop("nothingChanged")).toMatchObject({
      ok: true,
      error: false,
      noop: true,
      status: 200,
      error_code: "nothing-changed",
      message: "nothingChanged",
    });

    expect(conflict()).toMatchObject({
      status: 409,
      error_code: "conflict",
      message: "conflict",
    });
  });
}

function registerResultNamespaceTest() {
  test("keeps the convenience result namespace", () => {
    expect(result.ok("ready")).toMatchObject({
      ok: true,
      message: "ready",
    });
    expect(result.badRequest("missingValue")).toMatchObject({
      ok: false,
      status: 400,
      error_code: "missing-value",
      message: "missingValue",
    });
  });
}

describe("@trebired/result builders", () => {
  registerKeyedResultTest();
  registerResultVariantTest();
  registerResultNamespaceTest();
});
