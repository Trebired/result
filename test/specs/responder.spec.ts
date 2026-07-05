import { describe, expect, test } from "bun:test";

import {
  createResultResponder,
  mergeResultPresets,
  result,
} from "#index";

function createResponderPresets() {
  return mergeResultPresets(undefined, {
    error: {
      default: {
        view: "result/error",
      },
      types: {
        app: {
          default: {
            view: "result/app",
          },
        },
        "app.process": {
          statuses: {
            "404": {
              title: "Process not found",
              message: "The requested process does not exist.",
            },
          },
        },
      },
    },
  });
}

function registerJsonResponderTest() {
  test("delivers JSON payloads and preserves additional top-level fields", async () => {
    const seen: Array<Record<string, unknown>> = [];
    const responder = createResultResponder({
      json(context) {
        seen.push(context.payload);
        return context.payload;
      },
      text(context) {
        return context.text;
      },
    });

    const payload = Object.assign(result.ok("Saved.", {
      data: {
        id: "project_42",
      },
    }), {
      operation_id: "op_1",
    });

    const response = await responder.respond({
      res: {},
      result: payload,
      successMessage: "Saved successfully.",
    });

    expect(response).toEqual({
      ok: true,
      error: false,
      noop: false,
      status: 200,
      error_code: "",
      message: "Saved successfully.",
      data: {
        id: "project_42",
      },
      operation_id: "op_1",
    });
    expect(seen).toHaveLength(1);
  });
}

function createRenderFallbackObserver() {
  return {
    logs: [] as Array<Record<string, unknown>>,
    rendered: [] as Array<Record<string, unknown>>,
    textResponses: [] as Array<Record<string, unknown>>,
  };
}

function createRenderFallbackResponder(observer: ReturnType<typeof createRenderFallbackObserver>) {
  return createResultResponder({
    presets: createResponderPresets(),
    logger: {
      error(scope, message, meta) {
        observer.logs.push({
          scope,
          message,
          meta,
        });
      },
    },
    json() {
      throw new Error("json should not be used");
    },
    render(context) {
      observer.rendered.push(context.model as unknown as Record<string, unknown>);
      throw new Error("template exploded");
    },
    text(context) {
      observer.textResponses.push({
        text: context.text,
        cause: context.cause,
        title: context.model.title,
        message: context.model.message,
        view: context.model.view,
        renderModePath: context.model.renderModePath,
      });
      return context.text;
    },
    getRenderModePath() {
      return "app.process";
    },
  });
}

function expectRenderFallbackObserver(observer: ReturnType<typeof createRenderFallbackObserver>) {
  expect(observer.rendered[0]).toMatchObject({
    title: "Process not found",
    message: "Missing process.",
    view: "result/app",
    renderModePath: "app.process.error",
  });
  expect(observer.textResponses[0]).toEqual({
    text: "Not Found",
    cause: "fallback",
    title: "Process not found",
    message: "Missing process.",
    view: "result/app",
    renderModePath: "app.process.error",
  });
  expect(observer.logs[0]).toMatchObject({
    scope: "result.responder",
    message: "render-failed",
    meta: {
      status: 404,
      type: "app.process.publication",
      view: "result/app",
      error: "template exploded",
      requestId: "req_9",
    },
  });
}

function registerRenderFallbackTest() {
  test("falls back to plain text when rendering throws and logs a render failure", async () => {
    const observer = createRenderFallbackObserver();
    const responder = createRenderFallbackResponder(observer);

    const response = await responder.respond({
      req: {
        method: "GET",
      },
      res: {},
      result: result.notFound("process-not-found", "Missing process.", {
        meta: {
          requestId: "req_9",
        },
      }),
      render: true,
      type: "app.process.publication",
    });

    expect(response).toBe("Not Found");
    expectRenderFallbackObserver(observer);
  });
}

function registerNoRendererTextTest() {
  test("uses text delivery when render is requested without a render adapter", async () => {
    const responder = createResultResponder({
      json() {
        throw new Error("json should not be used");
      },
      text(context) {
        return `${context.cause}:${context.text}`;
      },
    });

    const response = await responder.respond({
      res: {},
      result: result.ok("Ready."),
      render: true,
    });

    expect(response).toBe("no-renderer:Success");
  });
}

describe("@trebired/result responder", () => {
  registerJsonResponderTest();
  registerRenderFallbackTest();
  registerNoRendererTextTest();
});
