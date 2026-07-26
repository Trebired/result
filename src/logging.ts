import {
  resolveLogger as resolveSharedLogger,
} from "@package/logger-adapter";

import type {
  NormalizedResultLogger,
  ResultLogger,
  ResultLoggerAdapter,
} from "#types";

function resolveLogger(
  logger?: ResultLogger,
  adapter?: ResultLoggerAdapter,
): NormalizedResultLogger | null {
  if (!logger && !adapter) {
    return null;
  }

  return resolveSharedLogger({
    adapter,
    fallback: "console",
    logger,
    source: "@package/result",
  }) as NormalizedResultLogger;
}

export {
  resolveLogger,
};
