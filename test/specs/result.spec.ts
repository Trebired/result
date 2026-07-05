import { describe, expect, test } from "bun:test";

import {
  badRequest,
  conflict,
  internal,
  noop,
  ok,
  result,
} from "#index";

function registerSuccessResultTest() {
  test("builds success results with typed payload metadata", () => {
    const output = ok("Saved.", {
      data: {
        id: "project_42",
      },
      details: {
        changed: true,
      },
      redirect: "/projects/project_42",
      meta: {
        requestId: "req_1",
      },
    });

    expect(output).toEqual({
      ok: true,
      error: false,
      noop: false,
      status: 200,
      error_code: "",
      message: "Saved.",
      data: {
        id: "project_42",
      },
      details: {
        changed: true,
      },
      redirect: "/projects/project_42",
      meta: {
        requestId: "req_1",
      },
    });
  });
}

function registerResultVariantTest() {
  test("builds noop and error variants with normalized error codes", () => {
    expect(noop("No Change!", "Nothing changed.")).toMatchObject({
      ok: true,
      error: false,
      noop: true,
      status: 200,
      error_code: "no-change",
      message: "Nothing changed.",
    });

    expect(badRequest("Missing Value", "Bad payload.")).toMatchObject({
      ok: false,
      error: true,
      noop: false,
      status: 400,
      error_code: "missing-value",
      message: "Bad payload.",
    });

    expect(conflict()).toMatchObject({
      status: 409,
      error_code: "conflict",
      message: "Conflict.",
    });
  });
}

function registerResultNamespaceTest() {
  test("keeps the convenience result namespace and internal helper defaults", () => {
    const failure = internal(undefined, undefined, {
      meta: {
        requestId: "req_2",
      },
    });

    expect(result.ok("Ready.")).toMatchObject({
      ok: true,
      message: "Ready.",
    });
    expect(failure).toMatchObject({
      ok: false,
      error: true,
      noop: false,
      status: 500,
      error_code: "internal-error",
      message: "Internal error.",
      meta: {
        requestId: "req_2",
      },
    });
  });
}

describe("@trebired/result builders", () => {
  registerSuccessResultTest();
  registerResultVariantTest();
  registerResultNamespaceTest();
});
