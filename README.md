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
  message: true,
  min: 8,
});

const writeFailed = result.internal("writeFailed", {
  message: false,
  details: { operation: "write" },
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

return respond(ctx, result.badRequest("missingPassword", { message: true, min: 8 }), {
  i18n: authI18n,
  render: "auto",
});
```

## Result Builders

The normal builder shape is key-first:

```ts
result.unauthorized("authRequired");
result.badRequest("missingPassword");
result.tooManyRequests("too-many-login-attempts");
result.badGateway("update-check-failed");
result.unavailable("platform-unavailable");
result.error("custom-weird-failure", 418, { data });
result.internal("writeFailed", { message: false, filePath });
```

The first argument is always the app/result/i18n `status_code`. The second argument is a mixed payload object. Reserved fields are `message`, `data`, `details`, and `redirect`; every other field is copied to `meta`.

`message` is a boolean toggle. `true` tells the responder to include a localized user-facing message. `false` suppresses that user-facing message.

```ts
const loaded = result.ok("user-loaded", {
  message: true,
  data: user,
  count: 3,
});
```

The shared result envelope is:

```ts
type ResultLike = {
  ok: boolean;
  error: boolean;
  noop: boolean;
  status: number;
  status_code: string;
  message: boolean;
  data: unknown | null;
  details?: unknown;
  redirect?: string;
  meta?: Record<string, unknown>;
};
```

Responder payloads preserve `status_code` and shape `message` as a localized string or `null`.

Builder helpers:

- `result.ok(status_code?, payload?)`
- `result.noop(status_code?, payload?)`
- `result.error(status_code?, status?, payload?)`
- `result.badRequest(status_code?, payload?)`
- `result.unauthorized(status_code?, payload?)`
- `result.forbidden(status_code?, payload?)`
- `result.notFound(status_code?, payload?)`
- `result.conflict(status_code?, payload?)`
- `result.unprocessable(status_code?, payload?)`
- `result.tooManyRequests(status_code?, payload?)`
- `result.badGateway(status_code?, payload?)`
- `result.unavailable(status_code?, payload?)`
- `result.gatewayTimeout(status_code?, payload?)`
- `result.internal(status_code?, payload?)`

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
- `meta` values are available for `{name}` and `{{ name }}` interpolation
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
- `badGateway`
- `unauthorized`
- `forbidden`
- `notFound`
- `conflict`
- `unprocessable`
- `tooManyRequests`
- `unavailable`
- `gatewayTimeout`
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
- `normalizeResultStatusCode`
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
