import type {
  BootResultTracingOptions,
  ResultRespondOptions,
  ResultTraceConfig,
} from "#types";

type ResultResponderConfigDefaults<TType extends string=string> =
Partial<Pick<ResultRespondOptions<TType>, "details"|"meta"|"render"|"title"|"type"|"view">>;

type ResultConfig = {
  forVersion?: string;
  responder?: ResultResponderConfigDefaults;
  tracing?: BootResultTracingOptions;
};

type NormalizedResultConfig = {
  forVersion: string;
  responder: ResultResponderConfigDefaults;
  tracing: BootResultTracingOptions;
};

type LoadedResultConfig = {
  config: NormalizedResultConfig;
  configPath: string | null;
  dependencies: string[];
};

type LoadResultConfigOptions = {
  configPath?: string;
  defaultIfMissing?: boolean;
  searchFrom?: string;
};

type ResultTracingConfigurableOptions = BootResultTracingOptions | ResultTraceConfig;

export type {
  LoadResultConfigOptions,
  LoadedResultConfig,
  NormalizedResultConfig,
  ResultConfig,
  ResultResponderConfigDefaults,
  ResultTracingConfigurableOptions,
};
