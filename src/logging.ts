import {
  resolveLogger as resolveSharedLogger,
} from "@package/logger-adapter";

import { PACKAGE_NAME } from "./package-metadata.js";
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
      source: PACKAGE_NAME,
  }) as NormalizedResultLogger;
}

export {
  resolveLogger,
};
