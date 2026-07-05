# @trebired/result

Shared result builders and transport-agnostic response orchestration for Bun and Node.js products.

`@trebired/result` is intentionally product-agnostic.

It does not know about Express, React, platform page names, agent sync payloads, logger group conventions, or any specific request/response runtime. It gives consumers a shared result envelope plus a responder layer they can wire into their own HTTP, RPC, worker, or page-rendering stack.

## Install

Runtime support: Bun 1+ and Node.js 18+.

```sh
npm install @trebired/result
```

## Quick Start

Build shared results from normal business logic:

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

Create a responder by supplying transport adapters:

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

## Result Builder

The shared result envelope is consistent across success, noop, and error outcomes:

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

The `meta` argument is a typed object with optional `data`, `details`, `redirect`, `meta`, and `error` fields.

## Responder Model

The responder factory keeps transport concerns outside the package:

- `json` handles API-style payload delivery.
- `render` is optional and only used when `respond({ render: true })` is requested.
- `text` receives a fallback payload when render is unavailable or throws.
- `getRenderModePath` is optional and lets a host derive mode-aware render variants such as `app.process.error`.

The responder resolves presets by:

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

Defaults intentionally stay reusable. No product-specific page names or views are built into the package.

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
- `DEFAULT_RESULT_PRESETS`
- `mergeResultPresets`
- `resolveResultPreset`
- `buildResultRenderModePath`
- `getResultLevel`
- `normalizeResultErrorCode`
- `toResultStatus`

Type exports:

- `ResultLike`
- `ResultLevel`
- `ResultInit`
- `ResultPreset`
- `ResultPresetMap`
- `ResultResponderConfig`
- `ResultRespondInput`
- `ResultRenderModel`
