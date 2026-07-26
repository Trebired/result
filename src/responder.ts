import { resolveLogger } from "./logging.js";
import {
  buildRenderModel,
  handleRenderFailure,
  resolvePayloadText,
  shapeResultPayload,
} from "#fkl0t1n99da1";
import { isPromiseLike } from "#shared";
import type {
  ResultLike,
  ResultResponder,
  ResultResponderConfig,
  ResultRespondOptions,
} from "#types";

function createResponder<Ctx = unknown, TType extends string = string>(
  config: ResultResponderConfig<Ctx, TType>,
): ResultResponder<Ctx, TType> {
  return function configuredRespond(
    context: Ctx,
    result: ResultLike | null | undefined,
    options: ResultRespondOptions<TType> = {},
  ) {
    return respond(context, result, options, config);
  };
}

function respond<Ctx = unknown, TType extends string = string>(
  context: Ctx,
  result: ResultLike | null | undefined,
  options: ResultRespondOptions<TType>,
  config: ResultResponderConfig<Ctx, TType>,
) {
  const logger = resolveLogger(config.logger, config.loggerAdapter);
  const payload = shapeResultPayload(result, config, context, options);
  const renderMode = options.render ?? false;

  if (renderMode === "text") {
    return config.sendText(context, payload.status, resolvePayloadText(payload, options));
  }

  if (renderMode === true || renderMode === "auto") {
    const model = buildRenderModel(payload, options);

    if (config.render) {
      return renderWithFallback(config, logger, context, model);
    }

    if (renderMode === true) {
      return config.sendText(context, payload.status, resolvePayloadText(payload, options));
    }
  }

  return config.sendJson(context, payload);
}

function renderWithFallback<Ctx = unknown, TType extends string = string>(
  config: ResultResponderConfig<Ctx, TType>,
  logger: ReturnType<typeof resolveLogger>,
  context: Ctx,
  model: ReturnType<typeof buildRenderModel<TType>>,
) {
  try {
    const rendered = config.render?.(context, model);

    if (isPromiseLike(rendered)) {
      return Promise.resolve(rendered).catch((error: unknown) => handleRenderFailure(config, logger, context, model, error));
    }

    return rendered;
  }
  catch (error) {
    return handleRenderFailure(config, logger, context, model, error);
  }
}

export {
  createResponder,
  respond,
};
