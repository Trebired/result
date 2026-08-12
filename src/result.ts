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
  status = 400,
  input?: ResultBuilderInput<TData, TDetails, TMeta>,
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
  return error(status_code, 400, input);
}

function unauthorized<
TData = unknown,
TDetails = unknown,
TMeta extends ResultMetadata = ResultMetadata,
>(
  status_code = "unauthorized",
  input?: ResultBuilderInput<TData, TDetails, TMeta>,
): ResultLike<TData, TDetails, TMeta> {
  return error(status_code, 401, input);
}

function forbidden<
TData = unknown,
TDetails = unknown,
TMeta extends ResultMetadata = ResultMetadata,
>(
  status_code = "forbidden",
  input?: ResultBuilderInput<TData, TDetails, TMeta>,
): ResultLike<TData, TDetails, TMeta> {
  return error(status_code, 403, input);
}

function notFound<
TData = unknown,
TDetails = unknown,
TMeta extends ResultMetadata = ResultMetadata,
>(
  status_code = "not-found",
  input?: ResultBuilderInput<TData, TDetails, TMeta>,
): ResultLike<TData, TDetails, TMeta> {
  return error(status_code, 404, input);
}

function conflict<
TData = unknown,
TDetails = unknown,
TMeta extends ResultMetadata = ResultMetadata,
>(
  status_code = "conflict",
  input?: ResultBuilderInput<TData, TDetails, TMeta>,
): ResultLike<TData, TDetails, TMeta> {
  return error(status_code, 409, input);
}

function unprocessable<
TData = unknown,
TDetails = unknown,
TMeta extends ResultMetadata = ResultMetadata,
>(
  status_code = "unprocessable-entity",
  input?: ResultBuilderInput<TData, TDetails, TMeta>,
): ResultLike<TData, TDetails, TMeta> {
  return error(status_code, 422, input);
}

function tooManyRequests<
TData = unknown,
TDetails = unknown,
TMeta extends ResultMetadata = ResultMetadata,
>(
  status_code = "too-many-requests",
  input?: ResultBuilderInput<TData, TDetails, TMeta>,
): ResultLike<TData, TDetails, TMeta> {
  return error(status_code, 429, input);
}

function badGateway<
TData = unknown,
TDetails = unknown,
TMeta extends ResultMetadata = ResultMetadata,
>(
  status_code = "bad-gateway",
  input?: ResultBuilderInput<TData, TDetails, TMeta>,
): ResultLike<TData, TDetails, TMeta> {
  return error(status_code, 502, input);
}

function unavailable<
TData = unknown,
TDetails = unknown,
TMeta extends ResultMetadata = ResultMetadata,
>(
  status_code = "unavailable",
  input?: ResultBuilderInput<TData, TDetails, TMeta>,
): ResultLike<TData, TDetails, TMeta> {
  return error(status_code, 503, input);
}

function gatewayTimeout<
TData = unknown,
TDetails = unknown,
TMeta extends ResultMetadata = ResultMetadata,
>(
  status_code = "gateway-timeout",
  input?: ResultBuilderInput<TData, TDetails, TMeta>,
): ResultLike<TData, TDetails, TMeta> {
  return error(status_code, 504, input);
}

function internal<
TData = unknown,
TDetails = unknown,
TMeta extends ResultMetadata = ResultMetadata,
>(
  status_code = "internal-error",
  input?: ResultBuilderInput<TData, TDetails, TMeta>,
): ResultLike<TData, TDetails, TMeta> {
  return error(status_code, 500, input);
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
  unprocessable,
  tooManyRequests,
  badGateway,
  unavailable,
  gatewayTimeout,
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
  badGateway,
  conflict,
  error,
  forbidden,
  gatewayTimeout,
  internal,
  noop,
  notFound,
  ok,
  result,
  tooManyRequests,
  unavailable,
  unprocessable,
  unauthorized,
};
