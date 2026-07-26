import type { ResultLevel, ResultLike, ResultMetadata } from "#types";

const RESULT_CORE_KEYS = new Set([
  "ok",
  "error",
  "noop",
  "status",
  "status_code",
  "message",
  "data",
  "details",
  "redirect",
  "meta",
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(value: unknown, key: string): boolean {
  return isObject(value) && Object.prototype.hasOwnProperty.call(value, key);
}

function toResultStatus(input: unknown, fallback: number): number {
  const current = Number(input);

  if (Number.isFinite(current) && current >= 100 && current <= 599) {
    return current;
  }

  return fallback;
}

function normalizeResultStatusCode(input: unknown): string {
  const current = typeof input === "string" ? input.trim() : "";

  if (!current) {
    return "";
  }

  return current
    .replace(/\s+/gu, "-")
    .replace(/-+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}

function getResultLevel(resultLike: unknown): ResultLevel {
  if (isObject(resultLike) && resultLike.ok === true) {
    return resultLike.noop === true ? "noop" : "ok";
  }

  return "error";
}

function normalizeResultLike(resultLike: ResultLike | null | undefined): ResultLike {
  if (isObject(resultLike)) {
    return resultLike as ResultLike;
  }

  return {
    ok: false,
    error: true,
    noop: false,
    status: 500,
    status_code: "invalid-result",
    message: true,
    data: null,
  };
}

function mergeMetadata(...items: Array<unknown>): ResultMetadata {
  const out: ResultMetadata = {};

  for (const item of items) {
    if (!isObject(item)) {
      continue;
    }

    Object.assign(out, item);
  }

  return out;
}

function extractResultExtras(resultLike: ResultLike): ResultMetadata {
  const out: ResultMetadata = {};

  for (const [key, value] of Object.entries(resultLike)) {
    if (RESULT_CORE_KEYS.has(key)) {
      continue;
    }

    out[key] = value;
  }

  return out;
}

function typeHierarchy(type: string | null | undefined): string[] {
  const current = typeof type === "string" ? type.trim() : "";

  if (!current) {
    return [];
  }

  const parts = current.split(".").filter(Boolean);
  const out: string[] = [];

  for (let index = 0; index < parts.length; index += 1) {
    out.push(parts.slice(0, index + 1).join("."));
  }

  return out;
}

function buildResultRenderModePath(basePath: string | null | undefined, level: ResultLevel): string {
  const suffix = level === "ok" ? "success" : level;
  const current = typeof basePath === "string" ? basePath.trim() : "";

  return current ? `${current}.${suffix}` : suffix;
}

function defaultResultStatus(level: ResultLevel): number {
  if (level === "error") {
    return 500;
  }

  return 200;
}

function defaultResultTitle(level: ResultLevel, status: number): string {
  if (level === "ok") {
    return "Success";
  }

  if (level === "noop") {
    return "No changes";
  }

  if (status === 400) {
    return "Bad request";
  }

  if (status === 401) {
    return "Unauthorized";
  }

  if (status === 403) {
    return "Forbidden";
  }

  if (status === 404) {
    return "Not Found";
  }

  if (status === 409) {
    return "Conflict";
  }

  return "Oops..";
}

function defaultResultMessage(level: ResultLevel, status: number): string {
  if (level === "ok") {
    return "The request completed successfully.";
  }

  if (level === "noop") {
    return "No changes were needed.";
  }

  if (status === 400) {
    return "The request could not be completed.";
  }

  if (status === 401) {
    return "You must sign in to continue.";
  }

  if (status === 403) {
    return "You do not have access to this resource.";
  }

  if (status === 404) {
    return "The requested resource does not exist.";
  }

  if (status === 409) {
    return "The request conflicts with the current resource state.";
  }

  return "Something went wrong.";
}

function defaultTextFallback(level: ResultLevel, status: number, title: string): string {
  if (level === "ok") {
    return title || "Success";
  }

  if (level === "noop") {
    return title || "No changes";
  }

  if (status === 404) {
    return "Not Found";
  }

  if (status === 403) {
    return "Forbidden";
  }

  if (status === 401) {
    return "Unauthorized";
  }

  return title || "Internal Server Error";
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return typeof error === "string" ? error : String(error);
}

function isPromiseLike<T = unknown>(value: unknown): value is PromiseLike<T> {
  return typeof value === "object" && value != null && typeof (value as PromiseLike<T>).then === "function";
}

export {
  buildResultRenderModePath,
  defaultResultMessage,
  defaultResultStatus,
  defaultResultTitle,
  defaultTextFallback,
  extractResultExtras,
  formatErrorMessage,
  getResultLevel,
  hasOwn,
  isObject,
  isPromiseLike,
  mergeMetadata,
  normalizeResultStatusCode,
  normalizeResultLike,
  toResultStatus,
  typeHierarchy,
};
