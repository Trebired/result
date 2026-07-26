import { normalizeResultStatusCode } from "#shared";
import {
  captureCallSite,
  isFailedResultLike,
  normalizeThrownValue,
  normalizeTraceLabel,
  previewCallArguments,
  RESULT_TRACE_LOG_GROUP,
  summarizeFailedResult,
} from "./utils.js";
import { createResultTraceRuntime } from "./runtime.js";
import type { ResultTraceContextInput, ResultTraceKind, ResultTraceRecord } from "./types.js";
import type { ResultLike } from "#types";

function traceResultWithRuntime(
  runtime: ReturnType<typeof createResultTraceRuntime>,
  result: ResultLike | null | undefined,
  options: ResultTraceContextInput = {},
): ResultTraceRecord | null {
  if (!isFailedResultLike(result)) {
    return null;
  }

  if (runtime.markTraced(result)) {
    return null;
  }

  const summary = summarizeFailedResult(result, runtime.config.summaryPreview, runtime.config.stackDepth);
  return emitTraceRecord(runtime, options.kind || "result", summary, options, runtime.config.failedResultSeverity);
}

function traceErrorWithRuntime(
  runtime: ReturnType<typeof createResultTraceRuntime>,
  error: unknown,
  options: ResultTraceContextInput = {},
): ResultTraceRecord | null {
  if (runtime.markTraced(error)) {
    return null;
  }

  const summary = normalizeThrownValue(error, runtime.config.summaryPreview, runtime.config.stackDepth);
  return emitTraceRecord(runtime, options.kind || "throw", summary, options, "error");
}

function traceFailureWithRuntime(
  runtime: ReturnType<typeof createResultTraceRuntime>,
  failure: unknown,
  options: ResultTraceContextInput = {},
): ResultTraceRecord | null {
  return isFailedResultLike(failure)
    ? traceResultWithRuntime(runtime, failure, options)
    : traceErrorWithRuntime(runtime, failure, options);
}

function emitTraceRecord(
  runtime: ReturnType<typeof createResultTraceRuntime>,
  kind: ResultTraceKind,
  summary: ReturnType<typeof normalizeThrownValue>,
  options: ResultTraceContextInput,
  severity: ResultTraceRecord["severity"],
): ResultTraceRecord | null {
  const label = normalizeTraceLabel(options.label || runtime.getTraceStack().slice(-1)[0], RESULT_TRACE_LOG_GROUP);
  const record: ResultTraceRecord = {
    createdAt: new Date().toISOString(),
    kind,
    severity: options.severity || severity,
    label,
    status_code: normalizeResultStatusCode(options.status_code) || summary.status_code,
    status: typeof options.status === "number" ? options.status : summary.status,
    message: typeof options.message === "string" && options.message.trim() ? options.message : summary.message,
    compactStack: summary.compactStack,
    failureSite: summary.failureSite || captureCallSite(undefined, runtime.config.stackDepth).site,
    argumentPreview: previewCallArguments(options.args || [], runtime.config.argumentPreview),
    metadataSummary: summary.metadataSummary,
    dataSummary: summary.dataSummary,
    detailsSummary: summary.detailsSummary,
    source: options.source || null,
    traceStack: runtime.getTraceStack(),
  };

  return runtime.emit(record);
}

export {
  traceErrorWithRuntime,
  traceFailureWithRuntime,
  traceResultWithRuntime,
};
