import type {
  LoggerAdapterEvent,
  LoggerAdapterGenericLogMethod,
  LoggerAdapterLogger,
  LoggerAdapterLogMethod,
  LoggerAdapterWriter,
  NormalizedLoggerAdapter,
} from "@package/logger-adapter";

export type MaybePromise<T> = T | Promise<T>;

export type ResultLevel = "ok" | "noop" | "error";

export type ResultMetadata = Record<string, unknown>;

export type ResultLogMethod = LoggerAdapterLogMethod;
export type ResultGenericLogMethod = LoggerAdapterGenericLogMethod;
export type ResultLogger = LoggerAdapterLogger;
export type ResultLoggerAdapter = LoggerAdapterWriter;
export type NormalizedResultLogger = NormalizedLoggerAdapter;
export type ResultLogEvent = LoggerAdapterEvent;

export type ResultLike<
  TData = unknown,
  TDetails = unknown,
  TMeta extends ResultMetadata = ResultMetadata,
> = {
  ok: boolean;
  error: boolean;
  noop: boolean;
  status: number;
  error_code: string;
  message: string;
  data: TData | null;
  details?: TDetails;
  redirect?: string;
  meta?: TMeta;
} & Record<string, unknown>;

export interface ResultPreset {
  status?: number;
  title?: string;
  message?: string;
  view?: string;
  meta?: ResultMetadata;
}

export interface ResultPresetGroup<TType extends string = string> {
  default?: ResultPreset;
  statuses?: Record<string, ResultPreset | undefined>;
  types?: Record<string, ResultPresetGroup<TType> | undefined>;
}

export type ResultPresetMap<TType extends string = string> =
  Partial<Record<ResultLevel, ResultPresetGroup<TType>>>;

export interface ResolveResultPresetInput<TType extends string = string> {
  presets?: ResultPresetMap<TType> | null;
  level: ResultLevel;
  status?: number | null;
  type?: TType | null;
}

export type ResultI18nBundle = {
  [key: string]: string | ResultI18nBundle;
};

export type ResultI18nCatalog = Record<string, ResultI18nBundle | undefined>;

export type ResultRenderMode = boolean | "auto" | "json" | "text";

export interface ResultRespondOptions<TType extends string = string> {
  i18n?: ResultI18nCatalog;
  render?: ResultRenderMode;
  type?: TType;
  title?: string;
  message?: string;
  details?: unknown;
  view?: string;
  meta?: ResultMetadata;
}

export interface ResultPayload<
  TData = unknown,
  TDetails = unknown,
  TMeta extends ResultMetadata = ResultMetadata,
> extends ResultLike<TData, TDetails, TMeta> {}

export interface ResultRenderModel<TType extends string = string> {
  level: ResultLevel;
  status: number;
  type: TType | "";
  title: string;
  message: string;
  view: string | null;
  details: unknown;
  meta: ResultMetadata;
  error_code: string;
  redirect: string | null;
  payload: ResultPayload;
}

export interface ResultResponderConfig<
  Ctx = unknown,
  TType extends string = string,
> {
  logger?: ResultLogger;
  loggerAdapter?: ResultLoggerAdapter;
  getLanguage?(context: Ctx): string | null | undefined;
  sendJson(context: Ctx, payload: ResultPayload): MaybePromise<unknown>;
  sendText(context: Ctx, status: number, text: string): MaybePromise<unknown>;
  render?(context: Ctx, model: ResultRenderModel<TType>): MaybePromise<unknown>;
}

export type ResultResponder<Ctx = unknown, TType extends string = string> = (
  context: Ctx,
  result: ResultLike | null | undefined,
  options?: ResultRespondOptions<TType>,
) => MaybePromise<unknown>;

export type * from "./trace/types.js";
