# Changelog

## 1.0.0

- Added first-class generic responder support with caller-provided JSON, text, render, and language callbacks.
- Made result builders key-first, with metadata objects used for interpolation variables and payload metadata.
- Added explicit local i18n bundle lookup with nested dot keys, Czech/selected-language resolution, English fallback from the provided bundle, and missing-key fallback to the key string.
- Kept localized payload messages separate from stable normalized result/error codes.
- Migrated the package to Code Discipline 4.7 alias-map mode without package.json imports.

## 0.2.1

- Moved package-owned result tracing and responder diagnostics under the `trebired.result` group root while leaving caller-supplied trace labels intact.

## 0.2.0

- Expanded `@trebired/result` into a fuller failure-handling toolkit with opt-in tracing, sync and async wrappers, promise tracing, export/object instrumentation, process hooks, module hooks, shared trace utilities, and AsyncLocalStorage-backed trace-stack propagation.
- Kept the responder and preset system reusable while adding explicit tracing APIs, stronger types, pack verification coverage for the new surface, and updated publishing-ready docs.

## 0.1.0

- Added the initial `@trebired/result` release with typed result builders, a transport-agnostic responder factory, preset resolution with parent type fallback, and pack verification coverage.
