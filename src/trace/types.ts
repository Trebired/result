import type { MaybePromise, ResultLike, ResultLogger, ResultLoggerAdapter } from "#types";

export type ResultTraceSeverity = "debug" | "info" | "warn" | "error";

export type ResultTraceKind =
  | "throw"
  | "reject"
  | "result"
  | "uncaught-exception"
  | "unhandled-rejection"
  | "module-load";

export interface ResultTracePreviewConfig {
  maxDepth?: number;
  maxItems?: number;
  maxStringLength?: number;
}

export type ResultTraceFilter =
  | string
  | RegExp
  | ((target: string) => boolean)
  | Array<string | RegExp | ((target: string) => boolean)>;

export interface ResultTraceRecord {
  createdAt: string;
  kind: ResultTraceKind;
  severity: ResultTraceSeverity;
  label: string;
  errorCode: string;
  status: number | null;
  message: string;
  compactStack: string[];
  failureSite: string | null;
  argumentPreview: string[];
  metadataSummary: string | null;
  dataSummary: string | null;
  detailsSummary: string | null;
  source: string | null;
  traceStack: string[];
}

export interface ResultTraceContextInput {
  label?: string | null;
  args?: unknown[];
  source?: string | null;
  kind?: ResultTraceKind;
  severity?: ResultTraceSeverity;
  status?: number | null;
  message?: string | null;
  errorCode?: string | null;
}

export interface ResultTraceConfig {
  enabled?: boolean;
  logger?: ResultLogger;
  loggerAdapter?: ResultLoggerAdapter;
  onTrace?(record: ResultTraceRecord): MaybePromise<void>;
  include?: ResultTraceFilter;
  exclude?: ResultTraceFilter;
  objectDepth?: number;
  stackDepth?: number;
  failedResultSeverity?: "warn" | "error";
  argumentPreview?: ResultTracePreviewConfig;
  summaryPreview?: ResultTracePreviewConfig;
}

export interface ResultTraceFailureSummary {
  errorCode: string;
  status: number | null;
  message: string;
  compactStack: string[];
  failureSite: string | null;
  metadataSummary: string | null;
  dataSummary: string | null;
  detailsSummary: string | null;
}

export interface ResultTraceCallSite {
  stack: string[];
  site: string | null;
}

export interface ResultTraceProcessLike {
  on(event: string, listener: (...args: any[]) => void): void;
  off?(event: string, listener: (...args: any[]) => void): void;
  removeListener?(event: string, listener: (...args: any[]) => void): void;
  exit?(code?: number): void;
}

export type ResultProcessExitHandler = (
  record: ResultTraceRecord,
  target: ResultTraceProcessLike,
) => void;

export interface ResultNodeModuleLike {
  _load(request: string, parent?: unknown, isMain?: boolean): unknown;
  _resolveFilename?(request: string, parent?: unknown, isMain?: boolean): string;
}

export interface ResultHookInstallation {
  installed: boolean;
  uninstall(): void;
}

export interface ResultTracingBoot {
  tracer: ResultTracer;
  processHooks: ResultHookInstallation | null;
  moduleHooks: ResultHookInstallation | null;
}

export interface ResultTraceClientOptions extends ResultTraceContextInput, ResultTraceConfig {
  tracer?: ResultTracer;
}

export interface WrapResultFunctionOptions extends ResultTraceClientOptions {}

export interface WrapResultPromiseOptions extends ResultTraceClientOptions {}

export interface InstrumentResultExportsOptions extends ResultTraceClientOptions {
  depth?: number;
}

export interface ResultProcessHookOptions extends ResultTraceClientOptions {
  process?: ResultTraceProcessLike;
  exitOnUncaughtException?: boolean | ResultProcessExitHandler;
  exitOnUnhandledRejection?: boolean | ResultProcessExitHandler;
}

export interface ResultModuleHookOptions extends ResultTraceClientOptions {
  module?: ResultNodeModuleLike;
  labelPrefix?: string;
  depth?: number;
}

export interface BootResultTracingOptions extends ResultTraceConfig {
  processHooks?: boolean | ResultProcessHookOptions;
  moduleHooks?: boolean | ResultModuleHookOptions;
}

export interface ResultTracer {
  readonly config: Readonly<ResultTraceConfig>;
  traceFailure(failure: unknown, options?: ResultTraceContextInput): ResultTraceRecord | null;
  traceResult(result: ResultLike | null | undefined, options?: ResultTraceContextInput): ResultTraceRecord | null;
  traceError(error: unknown, options?: ResultTraceContextInput): ResultTraceRecord | null;
  wrapFunction<Fn extends (...args: any[]) => any>(fn: Fn, options?: WrapResultFunctionOptions): Fn;
  wrapPromise<T>(promise: Promise<T>, options?: WrapResultPromiseOptions): Promise<T>;
  instrumentExports<T>(target: T, options?: InstrumentResultExportsOptions): T;
  installProcessHooks(options?: ResultProcessHookOptions): ResultHookInstallation;
  installModuleHooks(options?: ResultModuleHookOptions): ResultHookInstallation;
  getTraceStack(): string[];
  resetForTests(): void;
}
