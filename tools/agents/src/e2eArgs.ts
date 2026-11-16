/**
 * The Playwright arguments of `agents:e2e [web] [--] <args>`. A leading
 * `web` (the app, as `agents:serve web` takes it) is dropped: Playwright reads
 * a bare word as a file filter matched against the spec's whole path, and
 * every spec's path has `apps/web` in it, so `web e2e/show.spec.ts` would
 * run the whole suite.
 */
export const playwrightArgs = (
  argv: readonly string[],
): Readonly<{ args: string[]; dropped: string | null }> => {
  const dropped = argv[0] === 'web' ? 'web' : null;
  const rest = dropped ? argv.slice(1) : argv;
  const dash = rest.indexOf('--');
  return { args: dash === -1 ? [...rest] : rest.slice(dash + 1), dropped };
};
