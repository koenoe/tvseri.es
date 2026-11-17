/** Resolves after `ms` milliseconds (on the global timer, so fake timers apply) */
export const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
