import {
  defaultResultMessage,
  defaultResultTitle,
  defaultTextFallback,
  formatErrorMessage,
  hasOwn,
  normalizeResultErrorCode,
} from "#shared";
import type {
  NormalizedResultLogger,
  ResultLike,
  ResultPreset,
  ResultRenderContext,
  ResultResponderConfig,
  ResultResponderContextBase,
  ResultRespondInput,
  ResultTextContext,
} from "#types";

function createTextContext<
  Req = unknown,
  Res = unknown,
  TType extends string = string,
>(
  context: ResultRenderContext<Req, Res, TType>,
  cause: "fallback" | "no-renderer",
  renderError?: unknown,
): ResultTextContext<Req, Res, TType> {
  return {
    ...context,
    text: defaultTextFallback(context.model.level, context.model.status, context.model.title),
    cause,
    renderError,
  };
}

function handleRenderFailure<
  Req = unknown,
  Res = unknown,
  TType extends string = string,
>(
  config: ResultResponderConfig<Req, Res, TType>,
  logger: NormalizedResultLogger | null,
  context: ResultRenderContext<Req, Res, TType>,
  error: unknown,
) {
  logger?.error("result.responder", "render-failed", {
    level: context.level,
    status: context.model.status,
    type: context.model.type || null,
    view: context.model.view,
    error: formatErrorMessage(error),
    ...context.model.meta,
  });

  return config.text(createTextContext(context, "fallback", error));
}

function resolveMessage<
  Req = unknown,
  Res = unknown,
  TType extends string = string,
>(
  level: ResultResponderContextBase<Req, Res, TType>["level"],
  status: number,
  result: ResultLike,
  input: ResultRespondInput<Req, Res, TType>,
  preset?: ResultPreset,
): string {
  if ((level === "ok" || level === "noop") && typeof input.successMessage === "string" && input.successMessage.trim()) {
    return input.successMessage;
  }

  if (typeof input.message === "string" && input.message.trim()) {
    return input.message;
  }

  if (typeof result.message === "string" && result.message.trim()) {
    return result.message;
  }

  if (typeof preset?.message === "string" && preset.message.trim()) {
    return preset.message;
  }

  return defaultResultMessage(level, status);
}

function resolveTitle<
  Req = unknown,
  Res = unknown,
  TType extends string = string,
>(
  level: ResultResponderContextBase<Req, Res, TType>["level"],
  status: number,
  result: ResultLike,
  input: ResultRespondInput<Req, Res, TType>,
  preset: ResultPreset,
): string {
  const titleFromResult = typeof result.title === "string" ? result.title : "";

  if (typeof input.title === "string" && input.title.trim()) {
    return input.title;
  }

  if (titleFromResult.trim()) {
    return titleFromResult;
  }

  if (typeof preset.title === "string" && preset.title.trim()) {
    return preset.title;
  }

  return defaultResultTitle(level, status);
}

function resolveView<
  Req = unknown,
  Res = unknown,
  TType extends string = string,
>(
  result: ResultLike,
  input: ResultRespondInput<Req, Res, TType>,
  preset: ResultPreset,
): string | null {
  const viewFromResult = typeof result.view === "string" ? result.view : "";

  if (typeof input.view === "string" && input.view.trim()) {
    return input.view;
  }

  if (viewFromResult.trim()) {
    return viewFromResult;
  }

  if (typeof preset.view === "string" && preset.view.trim()) {
    return preset.view;
  }

  return null;
}

function resolveDetails<
  Req = unknown,
  Res = unknown,
  TType extends string = string,
>(
  result: ResultLike,
  input: ResultRespondInput<Req, Res, TType>,
): unknown {
  if (input.details !== undefined) {
    return input.details;
  }

  if (hasOwn(result, "details")) {
    return result.details;
  }

  return undefined;
}

function resolveErrorCode(level: ResultRenderContext["level"], status: number, result: ResultLike): string {
  const normalized = normalizeResultErrorCode(result.error_code);

  if (normalized) {
    return normalized;
  }

  if (level === "noop") {
    return "noop";
  }

  if (level === "ok") {
    return "";
  }

  if (status === 404) {
    return "not-found";
  }

  return "failed";
}

export {
  createTextContext,
  handleRenderFailure,
  resolveDetails,
  resolveErrorCode,
  resolveMessage,
  resolveTitle,
  resolveView,
};
