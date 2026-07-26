# Changelog

## 1.1.2

- Added package-owned organization metadata and derived result responder and trace log groups from `package.json`.
- Updated internal package dependency ranges to the current sibling package releases.

## 1.1.1

- Changed the generic error builder to `result.error(status_code, status, payload)` so custom HTTP statuses read consistently.
- Added status helper builders for unprocessable entity, rate limiting, upstream failures, unavailable services, and gateway timeouts.

## 1.1.0

- Replaced the old raw result code field with mandatory `status_code` values across builders, responder payloads, and tracing records.
- Changed builders so the first argument is always the app/result/i18n status code and the second argument splits reserved `message`, `data`, `details`, and `redirect` fields from metadata.
- Updated responders to localize by `status_code`, return localized `message: string | null`, and use sane text/render fallbacks when messages are disabled.

## 1.0.3

- Removed dead test scripts and stale test commands from publish workflows and maintainer docs.
- Standardized package metadata ordering and contributing guidance around the Trebired writing style.

## 1.0.2

- Removed package test suites and banned committed `*.spec.ts`/`*.spec.tsx` files through Code Discipline.
- Added Code Discipline enforcement for hardcoded `trebired` strings outside package metadata.
- Migrated Code Discipline to `.code-discipline/config.ts` with alias-map sync output.
- Updated package-generated artifact ignores and internal package dependency ranges.

## 1.0.1

- Removed the redundant explicit `.tmp` discipline ignore entry and kept generated/temp/report ignores in `.gitignore` through shared `use_gitignore` handling.

## 1.0.0

- Added first-class generic responder support with caller-provided JSON, text, render, and language callbacks.
- Made result builders key-first, with metadata objects used for interpolation variables and payload metadata.
- Added explicit local i18n bundle lookup with nested dot keys, Czech/selected-language resolution, English fallback from the provided bundle, and missing-key fallback to the key string.
- Kept localized payload messages separate from stable normalized result status codes.
- Migrated the package to Code Discipline 4.7 alias-map mode without package.json imports.

## 0.2.1

- Moved package-owned result tracing and responder diagnostics under the `trebired.result` group root while leaving caller-supplied trace labels intact.

## 0.2.0

- Expanded `@trebired/result` into a fuller failure-handling toolkit with opt-in tracing, sync and async wrappers, promise tracing, export/object instrumentation, process hooks, module hooks, shared trace utilities, and AsyncLocalStorage-backed trace-stack propagation.
- Kept the responder and preset system reusable while adding explicit tracing APIs, stronger types, pack verification coverage for the new surface, and updated publishing-ready docs.

## 0.1.0

- Added the initial `@trebired/result` release with typed result builders, a transport-agnostic responder factory, preset resolution with parent type fallback, and pack verification coverage.
