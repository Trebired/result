import { hasOwn, isObject, normalizeResultStatusCode, toResultStatus } from "#shared";
import type { ResultBuilderInput, ResultLike, ResultMetadata } from "#types";

const RESERVED_RESULT_OPTION_KEYS = new Set(["message", "data", "details", "redirect"]);

function ok<
  TData = unknown,
  TDetails = unknown,
  TMeta extends ResultMetadata = ResultMetadata,
>(
  status_code = "success",
  input?: ResultBuilderInput<TData, TDetails, TMeta>,
): ResultLike<TData, TDetails, TMeta> {
  return createResult({
    ok: true,
    error: false,
    noop: false,
    status: 200,
    status_code,
    fallbackStatusCode: "success",
    input,
  });
}

function noop<
  TData = unknown,
  TDetails = unknown,
  TMeta extends ResultMetadata = ResultMetadata,
>(
  status_code = "noop",
  input?: ResultBuilderInput<TData, TDetails, TMeta>,
): ResultLike<TData, TDetails, TMeta> {
  return createResult({
    ok: true,
    error: false,
    noop: true,
    status: 200,
    status_code,
    fallbackStatusCode: "noop",
    input,
  });
}

function error<
  TData = unknown,
  TDetails = unknown,
  TMeta extends ResultMetadata = ResultMetadata,
>(
  status_code = "failed",
  input?: ResultBuilderInput<TData, TDetails, TMeta>,
  status = 400,
): ResultLike<TData, TDetails, TMeta> {
  return createResult({
    ok: false,
    error: true,
    noop: false,
    status: toResultStatus(status, 400),
    status_code,
    fallbackStatusCode: "failed",
    input,
  });
}

function badRequest<
  TData = unknown,
  TDetails = unknown,
  TMeta extends ResultMetadata = ResultMetadata,
>(
  status_code = "bad-request",
  input?: ResultBuilderInput<TData, TDetails, TMeta>,
): ResultLike<TData, TDetails, TMeta> {
  return error(status_code, input, 400);
}

function unauthorized<
  TData = unknown,
  TDetails = unknown,
  TMeta extends ResultMetadata = ResultMetadata,
>(
  status_code = "unauthorized",
  input?: ResultBuilderInput<TData, TDetails, TMeta>,
): ResultLike<TData, TDetails, TMeta> {
  return error(status_code, input, 401);
}

function forbidden<
  TData = unknown,
  TDetails = unknown,
  TMeta extends ResultMetadata = ResultMetadata,
>(
  status_code = "forbidden",
  input?: ResultBuilderInput<TData, TDetails, TMeta>,
): ResultLike<TData, TDetails, TMeta> {
  return error(status_code, input, 403);
}

function notFound<
  TData = unknown,
  TDetails = unknown,
  TMeta extends ResultMetadata = ResultMetadata,
>(
  status_code = "not-found",
  input?: ResultBuilderInput<TData, TDetails, TMeta>,
): ResultLike<TData, TDetails, TMeta> {
  return error(status_code, input, 404);
}

function conflict<
  TData = unknown,
  TDetails = unknown,
  TMeta extends ResultMetadata = ResultMetadata,
>(
  status_code = "conflict",
  input?: ResultBuilderInput<TData, TDetails, TMeta>,
): ResultLike<TData, TDetails, TMeta> {
  return error(status_code, input, 409);
}

function internal<
  TData = unknown,
  TDetails = unknown,
  TMeta extends ResultMetadata = ResultMetadata,
>(
  status_code = "internal-error",
  input?: ResultBuilderInput<TData, TDetails, TMeta>,
): ResultLike<TData, TDetails, TMeta> {
  return error(status_code, input, 500);
}

const result = {
  ok,
  noop,
  error,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  internal,
} as const;

function createResult<
  TData = unknown,
  TDetails = unknown,
  TMeta extends ResultMetadata = ResultMetadata,
>({
  ok,
  error,
  noop,
  status,
  status_code,
  fallbackStatusCode,
  input,
}: {
  ok: boolean;
  error: boolean;
  noop: boolean;
  status: number;
  status_code: string;
  fallbackStatusCode: string;
  input?: ResultBuilderInput<TData, TDetails, TMeta>;
}): ResultLike<TData, TDetails, TMeta> {
  const options: Record<string, unknown> = isObject(input) ? input : {};
  const out: ResultLike<TData, TDetails, TMeta> = {
    ok,
    error,
    noop,
    status,
    status_code: normalizeResultStatusCode(status_code) || fallbackStatusCode,
    message: typeof options.message === "boolean" ? options.message : true,
    data: hasOwn(options, "data") ? ((options.data as TData | null | undefined) ?? null) : null,
  };

  if (hasOwn(options, "details") && options.details !== undefined) {
    out.details = options.details as TDetails;
  }

  if (typeof options.redirect === "string" && options.redirect.length > 0) {
    out.redirect = options.redirect;
  }

  const meta = extractBuilderMeta(options) as TMeta;
  if (Object.keys(meta).length > 0) {
    out.meta = meta;
  }

  return out;
}

function extractBuilderMeta(input: Record<string, unknown>): ResultMetadata {
  const meta: ResultMetadata = {};

  for (const [key, value] of Object.entries(input)) {
    if (!RESERVED_RESULT_OPTION_KEYS.has(key)) {
      meta[key] = value;
    }
  }

  return meta;
}

export {
  badRequest,
  conflict,
  error,
  forbidden,
  internal,
  noop,
  notFound,
  ok,
  result,
  unauthorized,
};
