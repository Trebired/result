import { resolveLogger } from "./logging.js";
import { resolveResultPreset } from "#presets";
import {
  createTextContext,
  handleRenderFailure,
  resolveDetails,
  resolveErrorCode,
  resolveMessage,
  resolveTitle,
  resolveView,
} from "#fkl0t1n99da1";
import {
  buildResultRenderModePath,
  defaultResultStatus,
  extractResultExtras,
  getResultLevel,
  hasOwn,
  isObject,
  isPromiseLike,
  mergeMetadata,
  normalizeResultLike,
  toResultStatus,
} from "#shared";
import type {
  ResultJsonContext,
  ResultLike,
  ResultRenderContext,
  ResultRenderModel,
  ResultResponder,
  ResultResponderConfig,
  ResultResponderContextBase,
  ResultRespondInput,
} from "#types";

function createResultResponder<
  Req = unknown,
  Res = unknown,
  TType extends string = string,
>(config: ResultResponderConfig<Req, Res, TType>): ResultResponder<Req, Res, TType> {
  const logger = resolveLogger(config.logger, config.loggerAdapter);

  return {
    respond(input) {
      const context = createBaseContext(config, input);

      if (input.render === true) {
        const model = buildRenderModel(config, context);
        return respondWithRender(config, logger, context, model);
      }

      const jsonContext = createJsonContext(context);
      return config.json(jsonContext);
    },
    resolvePreset(input) {
      return resolveResultPreset({
        ...input,
        presets: config.presets,
      });
    },
  };
}

function createBaseContext<
  Req = unknown,
  Res = unknown,
  TType extends string = string,
>(
  config: ResultResponderConfig<Req, Res, TType>,
  input: ResultRespondInput<Req, Res, TType>,
): ResultResponderContextBase<Req, Res, TType> {
  const result = normalizeResultLike(input.result);
  const level = getResultLevel(result);
  const status = toResultStatus(result.status, level === "error" ? 400 : 200);

  return {
    req: input.req,
    res: input.res,
    input,
    result,
    level,
    status,
  };
}

function createJsonContext<
  Req = unknown,
  Res = unknown,
  TType extends string = string,
>(
  context: ResultResponderContextBase<Req, Res, TType>,
): ResultJsonContext<Req, Res, TType> {
  return {
    ...context,
    payload: buildJsonPayload(context),
  };
}

function buildJsonPayload<
  Req = unknown,
  Res = unknown,
  TType extends string = string,
>(
  context: ResultResponderContextBase<Req, Res, TType>,
): ResultLike {
  const { input, level, result, status } = context;
  const payload: ResultLike = {
    ok: level !== "error",
    error: level === "error" ? result.error !== false : false,
    noop: level === "noop",
    status,
    error_code: resolveErrorCode(level, status, result),
    message: resolveMessage(level, status, result, input),
    data: hasOwn(result, "data") ? (result.data ?? null) : null,
  };

  if (hasOwn(result, "details") && result.details !== undefined) {
    payload.details = result.details;
  }

  if (typeof result.redirect === "string" && result.redirect.length > 0) {
    payload.redirect = result.redirect;
  }

  if (isObject(result.meta) && Object.keys(result.meta).length > 0) {
    payload.meta = result.meta;
  }

  Object.assign(payload, extractResultExtras(result));

  return payload;
}

function buildRenderModel<
  Req = unknown,
  Res = unknown,
  TType extends string = string,
>(
  config: ResultResponderConfig<Req, Res, TType>,
  context: ResultResponderContextBase<Req, Res, TType>,
): ResultRenderModel<TType> {
  const { input, level, result } = context;
  const preset = resolveResultPreset({
    presets: config.presets,
    level,
    status: result.status,
    type: input.type,
  });
  const status = toResultStatus(result.status, toResultStatus(preset.status, defaultResultStatus(level)));
  const message = resolveMessage(level, status, result, input, preset);
  const renderModePath = buildResultRenderModePath(config.getRenderModePath?.({
    ...context,
    status,
  }), level);
  const meta = mergeMetadata(
    preset.meta,
    isObject(result.meta) ? result.meta : null,
    input.meta,
  );

  return {
    level,
    status,
    type: (input.type || "") as TType | "",
    title: resolveTitle(level, status, result, input, preset),
    message,
    view: resolveView(result, input, preset),
    details: resolveDetails(result, input),
    meta,
    error_code: resolveErrorCode(level, status, result),
    redirect: typeof result.redirect === "string" && result.redirect.length > 0 ? result.redirect : null,
    preset,
    renderModePath,
  };
}

function respondWithRender<
  Req = unknown,
  Res = unknown,
  TType extends string = string,
>(
  config: ResultResponderConfig<Req, Res, TType>,
  logger: ReturnType<typeof resolveLogger>,
  context: ResultResponderContextBase<Req, Res, TType>,
  model: ResultRenderModel<TType>,
) {
  const renderContext: ResultRenderContext<Req, Res, TType> = {
    ...context,
    status: model.status,
    model,
  };

  if (!config.render) {
    return config.text(createTextContext(renderContext, "no-renderer"));
  }

  try {
    const rendered = config.render(renderContext);

    if (isPromiseLike(rendered)) {
      return Promise.resolve(rendered).catch((error: unknown) => handleRenderFailure(config, logger, renderContext, error));
    }

    return rendered;
  }
  catch (error) {
    return handleRenderFailure(config, logger, renderContext, error);
  }
}

export {
  createResultResponder,
};
