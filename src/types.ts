export type MaybePromise<T> = T | Promise<T>;

export type ResultLevel = "ok" | "noop" | "error";

export type ResultMetadata = Record<string, unknown>;

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

export interface ResultInit<
  TData = unknown,
  TDetails = unknown,
  TMeta extends ResultMetadata = ResultMetadata,
> {
  data?: TData | null;
  details?: TDetails;
  redirect?: string;
  meta?: TMeta;
  error?: boolean;
}

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

export interface ResultResponderLogger {
  error?(scope: string, message: string, meta?: ResultMetadata): void;
}

export interface ResultRespondInput<
  Req = unknown,
  Res = unknown,
  TType extends string = string,
> {
  req?: Req;
  res: Res;
  result: ResultLike | null | undefined;
  render?: boolean;
  type?: TType;
  title?: string;
  message?: string;
  details?: unknown;
  view?: string;
  meta?: ResultMetadata;
  successMessage?: string;
}

export interface ResultResponderContextBase<
  Req = unknown,
  Res = unknown,
  TType extends string = string,
> {
  req?: Req;
  res: Res;
  input: ResultRespondInput<Req, Res, TType>;
  result: ResultLike;
  level: ResultLevel;
  status: number;
}

export interface ResultRenderModeContext<
  Req = unknown,
  Res = unknown,
  TType extends string = string,
> extends ResultResponderContextBase<Req, Res, TType> {}

export interface ResultJsonContext<
  Req = unknown,
  Res = unknown,
  TType extends string = string,
> extends ResultResponderContextBase<Req, Res, TType> {
  payload: ResultLike;
}

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
  preset: ResultPreset;
  renderModePath: string;
}

export interface ResultRenderContext<
  Req = unknown,
  Res = unknown,
  TType extends string = string,
> extends ResultResponderContextBase<Req, Res, TType> {
  model: ResultRenderModel<TType>;
}

export interface ResultTextContext<
  Req = unknown,
  Res = unknown,
  TType extends string = string,
> extends ResultRenderContext<Req, Res, TType> {
  text: string;
  cause: "fallback" | "no-renderer";
  renderError?: unknown;
}

export interface ResultResponderConfig<
  Req = unknown,
  Res = unknown,
  TType extends string = string,
> {
  presets?: ResultPresetMap<TType>;
  logger?: ResultResponderLogger;
  json(context: ResultJsonContext<Req, Res, TType>): MaybePromise<unknown>;
  render?(context: ResultRenderContext<Req, Res, TType>): MaybePromise<unknown>;
  text(context: ResultTextContext<Req, Res, TType>): MaybePromise<unknown>;
  getRenderModePath?(context: ResultRenderModeContext<Req, Res, TType>): string | null | undefined;
}

export interface ResultResponder<
  Req = unknown,
  Res = unknown,
  TType extends string = string,
> {
  respond(input: ResultRespondInput<Req, Res, TType>): MaybePromise<unknown>;
  resolvePreset(input: Omit<ResolveResultPresetInput<TType>, "presets">): ResultPreset;
}
