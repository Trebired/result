import { hasOwn, normalizeResultErrorCode, toResultStatus } from "#shared";
import type { ResultInit, ResultLike, ResultMetadata } from "#types";

function ok<
  TData = unknown,
  TDetails = unknown,
  TMeta extends ResultMetadata = ResultMetadata,
>(
  message = "Success.",
  meta?: ResultInit<TData, TDetails, TMeta>,
): ResultLike<TData, TDetails, TMeta> {
  return createResult({
    ok: true,
    error: false,
    noop: false,
    status: 200,
    error_code: "",
    message,
    meta,
  });
}

function noop<
  TData = unknown,
  TDetails = unknown,
  TMeta extends ResultMetadata = ResultMetadata,
>(
  code = "noop",
  message = "No changes.",
  meta?: ResultInit<TData, TDetails, TMeta>,
): ResultLike<TData, TDetails, TMeta> {
  return createResult({
    ok: true,
    error: false,
    noop: true,
    status: 200,
    error_code: normalizeResultErrorCode(code) || "noop",
    message,
    meta,
  });
}

function error<
  TData = unknown,
  TDetails = unknown,
  TMeta extends ResultMetadata = ResultMetadata,
>(
  status = 400,
  code = "failed",
  message = "Request failed.",
  meta?: ResultInit<TData, TDetails, TMeta>,
): ResultLike<TData, TDetails, TMeta> {
  return createResult({
    ok: false,
    error: typeof meta?.error === "boolean" ? meta.error : true,
    noop: false,
    status: toResultStatus(status, 400),
    error_code: normalizeResultErrorCode(code) || "failed",
    message,
    meta,
  });
}

function badRequest<
  TData = unknown,
  TDetails = unknown,
  TMeta extends ResultMetadata = ResultMetadata,
>(
  code = "bad-request",
  message = "Bad request.",
  meta?: ResultInit<TData, TDetails, TMeta>,
): ResultLike<TData, TDetails, TMeta> {
  return error(400, code, message, meta);
}

function unauthorized<
  TData = unknown,
  TDetails = unknown,
  TMeta extends ResultMetadata = ResultMetadata,
>(
  code = "unauthorized",
  message = "Unauthorized.",
  meta?: ResultInit<TData, TDetails, TMeta>,
): ResultLike<TData, TDetails, TMeta> {
  return error(401, code, message, meta);
}

function forbidden<
  TData = unknown,
  TDetails = unknown,
  TMeta extends ResultMetadata = ResultMetadata,
>(
  code = "forbidden",
  message = "Forbidden.",
  meta?: ResultInit<TData, TDetails, TMeta>,
): ResultLike<TData, TDetails, TMeta> {
  return error(403, code, message, meta);
}

function notFound<
  TData = unknown,
  TDetails = unknown,
  TMeta extends ResultMetadata = ResultMetadata,
>(
  code = "not-found",
  message = "Not found.",
  meta?: ResultInit<TData, TDetails, TMeta>,
): ResultLike<TData, TDetails, TMeta> {
  return error(404, code, message, meta);
}

function conflict<
  TData = unknown,
  TDetails = unknown,
  TMeta extends ResultMetadata = ResultMetadata,
>(
  code = "conflict",
  message = "Conflict.",
  meta?: ResultInit<TData, TDetails, TMeta>,
): ResultLike<TData, TDetails, TMeta> {
  return error(409, code, message, meta);
}

function internal<
  TData = unknown,
  TDetails = unknown,
  TMeta extends ResultMetadata = ResultMetadata,
>(
  code = "internal-error",
  message = "Internal error.",
  meta?: ResultInit<TData, TDetails, TMeta>,
): ResultLike<TData, TDetails, TMeta> {
  return error(500, code, message, {
    ...meta,
    error: typeof meta?.error === "boolean" ? meta.error : true,
  });
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
  error_code,
  message,
  meta,
}: {
  ok: boolean;
  error: boolean;
  noop: boolean;
  status: number;
  error_code: string;
  message: string;
  meta?: ResultInit<TData, TDetails, TMeta>;
}): ResultLike<TData, TDetails, TMeta> {
  const out: ResultLike<TData, TDetails, TMeta> = {
    ok,
    error,
    noop,
    status,
    error_code,
    message,
    data: hasOwn(meta, "data") ? (meta?.data ?? null) : null,
  };

  if (hasOwn(meta, "details") && meta?.details !== undefined) {
    out.details = meta.details;
  }

  if (typeof meta?.redirect === "string" && meta.redirect.length > 0) {
    out.redirect = meta.redirect;
  }

  if (meta?.meta && Object.keys(meta.meta).length > 0) {
    out.meta = meta.meta;
  }

  return out;
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
