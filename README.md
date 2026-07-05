# @trebired/result

Shared result builders, response orchestration, and failure tracing for Bun and Node.js products.

`@trebired/result` gives Trebired packages a shared result envelope, a transport-facing responder layer, and an opt-in tracing toolkit for failed flows.

It does not know about Express, React, route names, page names, logger group wording, or a fixed runtime layout. Hosts bring their own adapters and decide which advanced tracing surfaces to enable.

## Install

Runtime support: Bun 1+ and Node.js 18+.

```sh
npm install @trebired/result
```

## Quick Start

Build shared result payloads in normal application code:

```ts
import { result } from "@trebired/result";

const saved = result.ok("Project saved.", {
  data: {
    id: "project_42",
  },
});

const missing = result.notFound("project-not-found", "Project not found.", {
  details: {
    id: "project_42",
  },
});
```

Wire a responder with transport adapters:

```ts
import { createResultResponder, result } from "@trebired/result";

const responder = createResultResponder({
  json({ res, payload }) {
    return res.status(payload.status).json(payload);
  },
  render({ res, model }) {
    return res.status(model.status).render("result", model);
  },
  text({ res, model, text }) {
    return res.status(model.status).type("text/plain").send(text);
  },
  getRenderModePath({ res }) {
    return res.locals.renderModePath;
  },
});

return responder.respond({
  req,
  res,
  result: result.notFound("project-not-found", "Project not found."),
  render: true,
  type: "app.project",
});
```

Add tracing only where it helps:

```ts
import { createResultTracer, result } from "@trebired/result";

const tracer = createResultTracer({
  failedResultSeverity: "warn",
  logger: console,
  onTrace(record) {
    console.error(record.label, record.message, record.traceStack);
  },
});

const loadProject = tracer.wrapFunction(async (id: string) => {
  if (id === "missing") {
    return result.notFound("project-not-found", "Project not found.");
  }

  throw new Error("Database offline");
}, {
  label: "project.load",
});
```

## Result Builder

The shared result envelope stays consistent across success, noop, and error outcomes:

```ts
type ResultLike = {
  ok: boolean;
  error: boolean;
  noop: boolean;
  status: number;
  error_code: string;
  message: string;
  data: unknown | null;
  details?: unknown;
  redirect?: string;
  meta?: Record<string, unknown>;
};
```

Builder helpers:

- `result.ok(message?, meta?)`
- `result.noop(code?, message?, meta?)`
- `result.error(status?, code?, message?, meta?)`
- `result.badRequest(...)`
- `result.unauthorized(...)`
- `result.forbidden(...)`
- `result.notFound(...)`
- `result.conflict(...)`
- `result.internal(...)`

The `meta` argument accepts optional `data`, `details`, `redirect`, `meta`, and `error` fields.

## Responder Model

The responder factory keeps transport concerns outside the package:

- `json` handles API-style payload delivery.
- `render` is optional and only used when `respond({ render: true })` is requested.
- `text` receives a fallback payload when render is unavailable or throws.
- `getRenderModePath` is optional and lets a host derive mode-aware render variants such as `app.process.error`.

Preset resolution walks in this order:

1. result level
2. exact status for that level
3. parent type chain from least specific to most specific

That means `app.process.publication` can inherit from `app`, then override with `app.process`, then override again with `app.process.publication`.

## Presets

The package exports shared defaults plus helpers for extension:

```ts
import {
  DEFAULT_RESULT_PRESETS,
  mergeResultPresets,
  resolveResultPreset,
} from "@trebired/result";

const presets = mergeResultPresets(DEFAULT_RESULT_PRESETS, {
  error: {
    types: {
      "app.project": {
        statuses: {
          404: {
            title: "Project not found",
            message: "The requested project does not exist.",
          },
        },
      },
    },
  },
});

const preset = resolveResultPreset({
  presets,
  level: "error",
  status: 404,
  type: "app.project.branch",
});
```

Defaults stay reusable. No app-specific views, routes, or page names are built in.

## Tracing Toolkit

Tracing is fully opt-in. Nothing patches the runtime unless you call a tracing API.

Logger delivery uses `@trebired/logger-adapter`, so package code can keep Trebired-style `group/message/metadata` logging while still accepting `console`, pino-style loggers, sink functions, or a custom `loggerAdapter` writer.

`createResultTracer()` gives you one runtime with:

- failed-result tracing
- thrown-error tracing
- rejected-promise tracing
- nested trace-stack propagation
- wrapper and proxy caches
- optional process and module hooks

```ts
import { createResultTracer, result } from "@trebired/result";

const records: unknown[] = [];
const tracer = createResultTracer({
  stackDepth: 10,
  failedResultSeverity: "warn",
  logger: console,
  onTrace(record) {
    records.push(record);
  },
});

tracer.traceFailure(result.notFound("project-not-found", "Missing."), {
  label: "project.read",
});
```

Each trace record includes:

- `kind`
- `severity`
- `label`
- `errorCode`
- `status`
- `message`
- `compactStack`
- `failureSite`
- `argumentPreview`
- `metadataSummary`
- `dataSummary`
- `detailsSummary`
- `source`
- `traceStack`

## Wrapping Functions And Promises

Use wrappers when you want tracing without rewriting the function body:

```ts
import { createResultTracer, result } from "@trebired/result";

const tracer = createResultTracer();

const saveProject = tracer.wrapFunction(async (input: { id: string }) => {
  if (!input.id) {
    return result.badRequest("missing-id", "Project id is required.");
  }

  return result.ok("Saved.");
}, {
  label: "project.save",
});

const remoteSync = tracer.wrapPromise(fetch("https://example.test").then((res) => {
  if (!res.ok) {
    throw new Error(`Remote sync failed: ${res.status}`);
  }

  return res;
}), {
  label: "project.sync",
});
```

Wrappers preserve original behavior:

- sync return values still return normally
- async return values still resolve or reject normally
- failed result payloads are traced
- thrown and rejected failures are traced
- the same function or promise is not wrapped twice inside the same tracer runtime

## Export And Object Instrumentation

If a module exports a plain object tree, you can instrument it without hand-wrapping every method:

```ts
import { createResultTracer } from "@trebired/result";
import * as handlers from "./handlers.js";

const tracer = createResultTracer({
  objectDepth: 3,
});

const instrumented = tracer.instrumentExports(handlers, {
  label: "handlers",
  include: "invoice",
});
```

Instrumentation:

- wraps callable exports
- descends into plain object trees up to the configured depth
- leaves symbol-based access alone
- caches proxies and wrappers so the same target is reused

## Process And Module Hooks

Advanced runtime hooks are available when you explicitly opt in.

Process hooks:

```ts
import { installResultProcessHooks } from "@trebired/result";

const hooks = installResultProcessHooks({
  logger: console,
  exitOnUncaughtException: false,
  exitOnUnhandledRejection: false,
});

hooks.uninstall();
```

Module hooks:

```ts
import { installResultModuleHooks } from "@trebired/result";

const hooks = installResultModuleHooks({
  include: [/services/, /workers/],
  labelPrefix: "module",
});

hooks.uninstall();
```

Module instrumentation only works in runtimes that expose a CommonJS-style loader with `_load` support. It is meant for targeted observability, not for blanket patching in every environment.

## Boot Helper

If you want one entrypoint that creates a tracer and installs selected hooks, use `bootResultTracing()`:

```ts
import { bootResultTracing } from "@trebired/result";

const boot = bootResultTracing({
  logger: console,
  processHooks: {
    exitOnUncaughtException: false,
  },
});

boot.tracer.wrapFunction(() => {
  throw new Error("boom");
}, {
  label: "demo.run",
});
```

## Configuration

Tracing configuration lets hosts control:

- `enabled`
- `logger`
- `loggerAdapter`
- `onTrace`
- `include`
- `exclude`
- `objectDepth`
- `stackDepth`
- `argumentPreview`
- `summaryPreview`
- `failedResultSeverity`

Wrapper and hook helpers also accept:

- `label`
- `source`
- `tracer`
- per-call `include` and `exclude`
- process exit policies
- module label prefixes and traversal depth

## Safe Defaults

Safe by default:

- result builders
- responder factory
- preset resolution
- manual tracing with `traceFailure`, `traceResult`, or `traceError`
- function and promise wrapping

More invasive surfaces:

- export/object instrumentation
- process hooks
- module hooks

Those advanced surfaces are still opt-in and can be turned off per host.

## Public API

Runtime exports:

- `result`
- `ok`
- `noop`
- `error`
- `badRequest`
- `unauthorized`
- `forbidden`
- `notFound`
- `conflict`
- `internal`
- `createResultResponder`
- `createResultTracer`
- `bootResultTracing`
- `wrapResultFunction`
- `wrapResultPromise`
- `instrumentResultExports`
- `installResultProcessHooks`
- `installResultModuleHooks`
- `DEFAULT_RESULT_PRESETS`
- `mergeResultPresets`
- `resolveResultPreset`
- `buildResultRenderModePath`
- `getResultLevel`
- `normalizeResultErrorCode`
- `toResultStatus`
- `captureCallSite`
- `compactStack`
- `isFailedResultLike`
- `matchTraceTarget`
- `normalizeThrownValue`
- `normalizeTraceLabel`
- `previewCallArguments`
- `previewValue`
- `summarizeFailedResult`

Type exports include the result, responder, preset, and tracing types used by those APIs.
