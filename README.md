# @trebired/result

Shared result builders, backend/system responder helpers, local i18n lookup, and failure tracing for Bun and Node.js packages.

`@trebired/result` is transport-agnostic. It does not import web frameworks, route files, frontend code, app registries, global dictionaries, or generated i18n state. Callers provide the delivery callbacks and local translation bundles.

## Install

Runtime support: Bun 1+ and Node.js 18+.

```sh
npm install @trebired/result
```

## Quick Start

Build keyed results:

```ts
import { result } from "@trebired/result";

const missingPassword = result.badRequest("missingPassword", {
  min: 8,
});

const writeFailed = result.internal("writeFailed", {
  filePath: "/var/data/output.json",
});
```

Wire a responder with caller-owned callbacks:

```ts
import { createResponder, result } from "@trebired/result";
import en from "./i18n/en";
import cs from "./i18n/cs";

const authI18n = { en, cs };

const respond = createResponder({
  getLanguage: (ctx) => ctx.lang,
  sendJson: (ctx, payload) => ctx.reply.json(payload.status, payload),
  sendText: (ctx, status, text) => ctx.reply.text(status, text),
  render: (ctx, model) => ctx.reply.render(model),
});

return respond(ctx, result.badRequest("missingPassword", { min: 8 }), {
  i18n: authI18n,
  render: "auto",
});
```

## Result Builders

The normal builder shape is key-first:

```ts
result.unauthorized("authRequired");
result.badRequest("missingPassword");
result.internal("writeFailed", { filePath });
```

The second argument is metadata. The responder uses it as interpolation variables and keeps it on `payload.meta`.

The shared result envelope is:

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

`message` is the stable local key on the raw result. `error_code` is the normalized stable code, for example `missingPassword` becomes `missing-password`. Responder payloads localize `message` while preserving `error_code`.

Builder helpers:

- `result.ok(messageKey?, metadata?)`
- `result.noop(messageKey?, metadata?)`
- `result.error(status?, messageKey?, metadata?)`
- `result.badRequest(messageKey?, metadata?)`
- `result.unauthorized(messageKey?, metadata?)`
- `result.forbidden(messageKey?, metadata?)`
- `result.notFound(messageKey?, metadata?)`
- `result.conflict(messageKey?, metadata?)`
- `result.internal(messageKey?, metadata?)`

## Local I18n

Pass local bundles at respond time:

```ts
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

await respond(ctx, result.badRequest("protect.missingMode"), {
  i18n: authI18n,
});
```

Translation rules:

- language comes from `getLanguage(ctx)`
- lookup uses the explicit `i18n` object passed to `respond`
- nested dot keys are supported
- metadata is available for `{name}` and `{{ name }}` interpolation
- the selected language wins when it has the key
- missing selected-language keys fall back to `en` in the same local bundle
- missing keys in all bundles return the key itself

There is no global registry, generated dictionary source, or `globalThis` lookup.

## Responder

`createResponder(config)` returns a callable responder:

```ts
const respond = createResponder({
  getLanguage: (ctx) => ctx.lang,
  sendJson: (ctx, payload) => ctx.send(payload.status, payload),
  sendText: (ctx, status, text) => ctx.sendText(status, text),
  render: (ctx, model) => ctx.render(model),
});

await respond(ctx, result.unauthorized("authRequired"), {
  i18n,
});
```

Dispatch options:

- default or `render: "json"` calls `sendJson(ctx, payload)`
- `render: "text"` calls `sendText(ctx, status, message)`
- `render: "auto"` calls `render(ctx, model)` when configured, otherwise JSON
- `render: true` calls `render(ctx, model)` when configured, otherwise text

The package also exports `respond(ctx, result, options, config)` for callers that want a one-shot helper instead of a preconfigured responder.

## Tracing Toolkit

Tracing is fully opt-in. Nothing patches the runtime unless you call a tracing API.

Logger delivery uses `@trebired/logger-adapter`, so package code can keep Trebired-style `group/message/metadata` logging while still accepting `console`, pino-style loggers, sink functions, or a custom `loggerAdapter` writer.

```ts
import { createResultTracer, result } from "@trebired/result";

const tracer = createResultTracer({
  failedResultSeverity: "warn",
  logger: console,
});

tracer.traceFailure(result.notFound("projectMissing"), {
  label: "project.read",
});
```

`createResultTracer()` supports:

- failed-result tracing
- thrown-error tracing
- rejected-promise tracing
- nested trace-stack propagation
- wrapper and proxy caches
- optional process and module hooks

## Wrapping Functions And Promises

Use wrappers when you want tracing without rewriting the function body:

```ts
import { createResultTracer, result } from "@trebired/result";

const tracer = createResultTracer();

const saveProject = tracer.wrapFunction(async (input: { id: string }) => {
  if (!input.id) {
    return result.badRequest("missingId", {
      field: "id",
    });
  }

  return result.ok("saved");
}, {
  label: "project.save",
});
```

Wrappers preserve original behavior:

- sync return values still return normally
- async return values still resolve or reject normally
- failed result payloads are traced
- thrown and rejected failures are traced
- the same function or promise is not wrapped twice inside the same tracer runtime

## Presets

The package still exports generic preset helpers for callers that want shared status/title defaults:

```ts
import {
  DEFAULT_RESULT_PRESETS,
  mergeResultPresets,
  resolveResultPreset,
} from "@trebired/result";

const presets = mergeResultPresets(DEFAULT_RESULT_PRESETS, {
  error: {
    statuses: {
      404: {
        title: "Missing",
      },
    },
  },
});

const preset = resolveResultPreset({
  presets,
  level: "error",
  status: 404,
});
```

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
- `createResponder`
- `respond`
- `shapeResultPayload`
- `translateMessage`
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

Type exports include result, responder, i18n, preset, and tracing types used by those APIs.
