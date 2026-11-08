/**
 * Logs a structured warning for a failure the caller recovers from (a
 * best-effort read or write, a skipped item). Only the error message is
 * logged: no stack traces or sensitive details.
 */
export const logWarn = (message: string, error: unknown) => {
  console.warn(
    JSON.stringify({
      level: 'warn',
      message,
      reason: error instanceof Error ? error.message : String(error),
    }),
  );
};
