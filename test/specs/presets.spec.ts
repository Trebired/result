import { describe, expect, test } from "bun:test";

import {
  DEFAULT_RESULT_PRESETS,
  mergeResultPresets,
  resolveResultPreset,
} from "#index";

function createPresetOverrides() {
  return {
    error: {
      default: {
        view: "result/error",
      },
      types: {
        app: {
          default: {
            view: "result/app",
          },
          statuses: {
            "404": {
              title: "App not found",
            },
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
        "app.process.publication": {
          default: {
            meta: {
              scope: "publication",
            },
          },
        },
      },
    },
  } as const;
}

function registerParentFallbackPresetTest() {
  test("resolves parent type fallbacks from broad to specific", () => {
    const presets = mergeResultPresets(DEFAULT_RESULT_PRESETS, createPresetOverrides());

    const preset = resolveResultPreset({
      presets,
      level: "error",
      status: 404,
      type: "app.process.publication",
    });

    expect(preset).toEqual({
      status: 404,
      title: "Process not found",
      message: "The requested process does not exist.",
      view: "result/app",
      meta: {
        scope: "publication",
      },
    });
  });
}

function registerSharedDefaultPresetTest() {
  test("falls back to shared defaults when no override exists", () => {
    const preset = resolveResultPreset({
      level: "noop",
      status: 200,
      type: "anything.deep",
    });

    expect(preset).toEqual({
      status: 200,
      title: "No changes",
      message: "No changes were needed.",
    });
  });
}

describe("@trebired/result presets", () => {
  registerParentFallbackPresetTest();
  registerSharedDefaultPresetTest();
});
