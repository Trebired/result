import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "bun:test";

import {
  createResponder,
  result,
  shapeResultPayload,
  translateMessage,
} from "#index";

const authI18n = {
  en: {
    authRequired: "Authentication required.",
    missingPassword: "Password must be at least {min} characters.",
    protect: {
      missingMode: "Missing protect mode.",
    },
  },
  cs: {
    authRequired: "Je vyzadovano prihlaseni.",
    missingPassword: "Heslo musi mit alespon {min} znaku.",
  },
};

type TestContext = {
  lang?: string;
  sent: unknown[];
};

function createTestResponder() {
  return createResponder<TestContext>({
    getLanguage: (ctx) => ctx.lang,
    sendJson(ctx, payload) {
      ctx.sent.push({
        type: "json",
        payload,
      });
      return payload;
    },
    sendText(ctx, status, text) {
      ctx.sent.push({
        type: "text",
        status,
        text,
      });
      return text;
    },
    render(ctx, model) {
      ctx.sent.push({
        type: "render",
        model,
      });
      return model;
    },
  });
}

function createTestContext(lang?: string): TestContext {
  return {
    lang,
    sent: [],
  };
}

function registerInterpolationTest() {
  test("uses local bundle translations and metadata interpolation", async () => {
    const ctx = createTestContext("en");
    const respond = createTestResponder();

    const payload = await respond(ctx, result.badRequest("missingPassword", { min: 8 }), {
      i18n: authI18n,
    });

    expect(payload).toMatchObject({
      status: 400,
      error_code: "missing-password",
      message: "Password must be at least 8 characters.",
      meta: {
        min: 8,
      },
    });
    expect(ctx.sent).toHaveLength(1);
  });
}

function registerLanguageFallbackTests() {
  test("prefers Czech translations when the configured language is cs", async () => {
    const ctx = createTestContext("cs");
    const respond = createTestResponder();

    const payload = await respond(ctx, result.unauthorized("authRequired"), {
      i18n: authI18n,
    });

    expect(payload).toMatchObject({
      status: 401,
      error_code: "auth-required",
      message: "Je vyzadovano prihlaseni.",
    });
  });

  test("falls back to English from the provided local bundle", async () => {
    const ctx = createTestContext("cs");
    const respond = createTestResponder();

    const payload = await respond(ctx, result.badRequest("protect.missingMode"), {
      i18n: authI18n,
    });

    expect(payload).toMatchObject({
      status: 400,
      error_code: "protect-missing-mode",
      message: "Missing protect mode.",
    });
  });

  test("supports missing-key fallback to the key string", async () => {
    const ctx = createTestContext("cs");
    const respond = createTestResponder();

    const payload = await respond(ctx, result.badRequest("notInBundle"), {
      i18n: authI18n,
    });

    expect(payload).toMatchObject({
      error_code: "not-in-bundle",
      message: "notInBundle",
    });
  });
}

function registerDispatchTests() {
  test("uses caller-provided send and render callbacks", async () => {
    const ctx = createTestContext("en");
    const respond = createTestResponder();

    const rendered = await respond(ctx, result.internal("writeFailed", { filePath: "/tmp/out.txt" }), {
      i18n: {
        en: {
          writeFailed: "Could not write {filePath}.",
        },
      },
      render: "auto",
      type: "system.write",
      view: "result/error",
    });

    expect(rendered).toMatchObject({
      status: 500,
      type: "system.write",
      view: "result/error",
      message: "Could not write /tmp/out.txt.",
      error_code: "write-failed",
    });
    expect(ctx.sent).toHaveLength(1);
    expect(ctx.sent[0]).toMatchObject({
      type: "render",
    });
  });

  test("supports explicit text dispatch through the caller callback", async () => {
    const ctx = createTestContext("en");
    const respond = createTestResponder();

    const text = await respond(ctx, result.badRequest("missingPassword", { min: 12 }), {
      i18n: authI18n,
      render: "text",
    });

    expect(text).toBe("Password must be at least 12 characters.");
    expect(ctx.sent[0]).toEqual({
      type: "text",
      status: 400,
      text: "Password must be at least 12 characters.",
    });
  });
}

function registerHelperTests() {
  test("exposes payload shaping and translation helpers", () => {
    expect(translateMessage("missingPassword", {
      bundle: authI18n,
      language: "en",
      variables: {
        min: 10,
      },
    })).toBe("Password must be at least 10 characters.");

    expect(shapeResultPayload(result.badRequest("missingPassword", { min: 6 }), {
      sendJson() {},
      sendText() {},
    }, { lang: "en" }, {
      i18n: authI18n,
    })).toMatchObject({
      message: "Password must be at least 6 characters.",
    });
  });
}

function registerNoFrameworkImportTest() {
  test("does not import app or web framework packages", () => {
    const sourceDir = path.resolve(import.meta.dir, "../../src");
    const files = collectSourceFiles(sourceDir);
    const combined = files.map((file) => fs.readFileSync(file, "utf8")).join("\n");

    expect(combined).not.toMatch(/from\s+["']express["']/u);
    expect(combined).not.toMatch(/from\s+["'][^"']*(platform|frontend|app\/)/u);
    expect(combined).not.toContain("res.locals");
    expect(combined).not.toContain("globalThis");
  });
}

function collectSourceFiles(dir: string): string[] {
  const out: string[] = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      out.push(...collectSourceFiles(filePath));
      continue;
    }

    if (entry.isFile() && filePath.endsWith(".ts")) {
      out.push(filePath);
    }
  }

  return out;
}

describe("@trebired/result responder", () => {
  registerInterpolationTest();
  registerLanguageFallbackTests();
  registerDispatchTests();
  registerHelperTests();
  registerNoFrameworkImportTest();
});
