import { normalizeResultErrorCode, toResultStatus } from "#shared";
import type { ResultLike, ResultMetadata } from "#types";

function ok<
  TData = unknown,
  TDetails = unknown,
  TMeta extends ResultMetadata = ResultMetadata,
>(
  message = "success",
  meta?: TMeta,
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
  message = "noop",
  meta?: TMeta,
): ResultLike<TData, TDetails, TMeta> {
  return createResult({
    ok: true,
    error: false,
    noop: true,
    status: 200,
    error_code: normalizeResultErrorCode(message) || "noop",
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
  message = "failed",
  meta?: TMeta,
): ResultLike<TData, TDetails, TMeta> {
  return createResult({
    ok: false,
    error: true,
    noop: false,
    status: toResultStatus(status, 400),
    error_code: normalizeResultErrorCode(message) || "failed",
    message,
    meta,
  });
}

function badRequest<
  TData = unknown,
  TDetails = unknown,
  TMeta extends ResultMetadata = ResultMetadata,
>(
  message = "badRequest",
  meta?: TMeta,
): ResultLike<TData, TDetails, TMeta> {
  return error(400, message, meta);
}

function unauthorized<
  TData = unknown,
  TDetails = unknown,
  TMeta extends ResultMetadata = ResultMetadata,
>(
  message = "unauthorized",
  meta?: TMeta,
): ResultLike<TData, TDetails, TMeta> {
  return error(401, message, meta);
}

function forbidden<
  TData = unknown,
  TDetails = unknown,
  TMeta extends ResultMetadata = ResultMetadata,
>(
  message = "forbidden",
  meta?: TMeta,
): ResultLike<TData, TDetails, TMeta> {
  return error(403, message, meta);
}

function notFound<
  TData = unknown,
  TDetails = unknown,
  TMeta extends ResultMetadata = ResultMetadata,
>(
  message = "notFound",
  meta?: TMeta,
): ResultLike<TData, TDetails, TMeta> {
  return error(404, message, meta);
}

function conflict<
  TData = unknown,
  TDetails = unknown,
  TMeta extends ResultMetadata = ResultMetadata,
>(
  message = "conflict",
  meta?: TMeta,
): ResultLike<TData, TDetails, TMeta> {
  return error(409, message, meta);
}

function internal<
  TData = unknown,
  TDetails = unknown,
  TMeta extends ResultMetadata = ResultMetadata,
>(
  message = "internalError",
  meta?: TMeta,
): ResultLike<TData, TDetails, TMeta> {
  return error(500, message, meta);
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
  meta?: TMeta;
}): ResultLike<TData, TDetails, TMeta> {
  const out: ResultLike<TData, TDetails, TMeta> = {
    ok,
    error,
    noop,
    status,
    error_code,
    message,
    data: null,
  };

  if (meta && Object.keys(meta).length > 0) {
    out.meta = meta;
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
