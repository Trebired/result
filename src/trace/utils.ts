import {
  getResultLevel,
  isObject,
  normalizeResultStatusCode,
  toResultStatus,
} from "#shared";
import type {
  ResultTraceCallSite,
  ResultTraceFailureSummary,
  ResultTraceFilter,
  ResultTracePreviewConfig,
} from "./types.js";
import type { ResultLike } from "#types";

const STACK_LINE_PREFIX = /^\s*at\s+/u;

function normalizeTraceLabel(input: unknown, fallback = "package.result.trace"): string {
  const label = typeof input === "string" ? input.trim() : "";
  return label || fallback;
}

function isFailedResultLike(value: unknown): value is ResultLike {
  return isObject(value) && value.ok === false && getResultLevel(value) === "error";
}

function captureCallSite(input?: unknown, maxLines = 8): ResultTraceCallSite {
  const stack = compactStack(input, maxLines);
  return {
    stack,
    site: stack[0] || null,
  };
}

function compactStack(input?: unknown, maxLines = 8): string[] {
  const stackSource = readStackSource(input);
  return stackSource
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => STACK_LINE_PREFIX.test(line))
    .map((line) => line.replace(STACK_LINE_PREFIX, ""))
    .filter((line) => !line.includes("/trace/"))
    .slice(0, Math.max(0, maxLines));
}

function normalizeThrownValue(
  value: unknown,
  preview: ResultTracePreviewConfig,
  stackDepth: number,
): ResultTraceFailureSummary {
  if (isFailedResultLike(value)) {
    return summarizeFailedResult(value, preview, stackDepth);
  }

  const captured = captureCallSite(value, stackDepth);
  const source = isObject(value) ? value as Record<string, unknown> : null;

  return {
    status_code: normalizeResultStatusCode(source?.status_code) || "thrown-error",
    status: Number.isFinite(Number(source?.status)) ? toResultStatus(source?.status, 500) : null,
    message: readThrownMessage(value),
    compactStack: captured.stack,
    failureSite: captured.site,
    metadataSummary: null,
    dataSummary: null,
    detailsSummary: source?.details != null ? previewValue(source.details, preview) : null,
  };
}

function summarizeFailedResult(
  result: ResultLike,
  preview: ResultTracePreviewConfig,
  stackDepth: number,
): ResultTraceFailureSummary {
  const captured = captureCallSite(result.stack, stackDepth);
  return {
    status_code: normalizeResultStatusCode(result.status_code) || "failed",
    status: Number.isFinite(Number(result.status)) ? toResultStatus(result.status, 500) : null,
    message: normalizeResultStatusCode(result.status_code) || "Result failed.",
    compactStack: captured.stack,
    failureSite: captured.site,
    metadataSummary: isObject(result.meta) ? previewValue(result.meta, preview) : null,
    dataSummary: result.data != null ? previewValue(result.data, preview) : null,
    detailsSummary: result.details != null ? previewValue(result.details, preview) : null,
  };
}

function previewCallArguments(args: unknown[], preview: ResultTracePreviewConfig): string[] {
  const maxItems = preview.maxItems || 5;
  return args.slice(0, maxItems).map((value) => previewValue(value, preview));
}

function previewValue(value: unknown, preview: ResultTracePreviewConfig): string {
  const state = {
    depth: preview.maxDepth || 2,
    items: preview.maxItems || 5,
    length: preview.maxStringLength || 120,
    seen: new WeakSet<object>(),
  };
  return renderPreviewValue(value, state, 0);
}

function matchTraceTarget(target: string, include?: ResultTraceFilter, exclude?: ResultTraceFilter): boolean {
  if (exclude && matchesFilter(exclude, target)) {
    return false;
  }

  return include ? matchesFilter(include, target) : true;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!isObject(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function renderPreviewValue(
  value: unknown,
  state: { depth: number; items: number; length: number; seen: WeakSet<object> },
  level: number,
): string {
  if (value == null) return String(value);
  if (typeof value === "string") return JSON.stringify(truncateString(value, state.length));
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return String(value);
  if (typeof value === "function") return `[Function ${value.name || "anonymous"}]`;
  if (typeof value === "symbol") return value.toString();
  if (level >= state.depth) return Array.isArray(value) ? "[Array]" : "[Object]";
  if (typeof value !== "object") return String(value);
  if (state.seen.has(value)) return "[Circular]";

  state.seen.add(value);
  return Array.isArray(value)
    ? renderArrayPreview(value, state, level)
    : renderObjectPreview(value as Record<string, unknown>, state, level);
}

function renderArrayPreview(
  value: unknown[],
  state: { depth: number; items: number; length: number; seen: WeakSet<object> },
  level: number,
): string {
  const items = value.slice(0, state.items).map((entry) => renderPreviewValue(entry, state, level + 1));
  return `[${items.join(", ")}${value.length > state.items ? ", ..." : ""}]`;
}

function renderObjectPreview(
  value: Record<string, unknown>,
  state: { depth: number; items: number; length: number; seen: WeakSet<object> },
  level: number,
): string {
  const entries = Object.entries(value)
    .slice(0, state.items)
    .map(([key, entry]) => `${key}: ${renderPreviewValue(entry, state, level + 1)}`);
  return `{ ${entries.join(", ")}${Object.keys(value).length > state.items ? ", ..." : ""} }`;
}

function truncateString(value: string, length: number): string {
  return value.length > length ? `${value.slice(0, Math.max(0, length - 3))}...` : value;
}

function matchesFilter(filter: ResultTraceFilter, target: string): boolean {
  if (Array.isArray(filter)) {
    return filter.some((entry) => matchesFilter(entry, target));
  }

  if (typeof filter === "string") {
    return target.includes(filter);
  }

  return filter instanceof RegExp ? filter.test(target) : filter(target);
}

function readStackSource(input?: unknown): string {
  if (typeof input === "string") {
    return input;
  }

  if (isObject(input) && typeof input.stack === "string") {
    return input.stack;
  }

  return new Error().stack || "";
}

function readThrownMessage(value: unknown): string {
  if (value instanceof Error && value.message) {
    return value.message;
  }

  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (isObject(value) && typeof value.message === "string" && value.message.trim()) {
    return value.message;
  }

  return "Unknown failure.";
}

export {
  captureCallSite,
  compactStack,
  isFailedResultLike,
  isPlainObject,
  matchTraceTarget,
  normalizeThrownValue,
  normalizeTraceLabel,
  previewCallArguments,
  previewValue,
  summarizeFailedResult,
};
