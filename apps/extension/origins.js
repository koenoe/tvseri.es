// The one site a build talks to. The dev copy `pnpm dev` writes (`dev-build/`,
// `writeDevExtension`) rewrites the SITE_ORIGIN line to the local dev server.

// chrome.storage.local keys; results are `results[origin][service]`
export const SERVICE_KEY = 'service';
export const RESULTS_KEY = 'results';

export const PRODUCTION_ORIGIN = 'https://www.tvseri.es';
// The dev build rewrites this line: keep it as is
export const SITE_ORIGIN = PRODUCTION_ORIGIN;

/** Whether a site may hand this extension a code and receive a session */
export const allowedOrigin = (origin) => origin === SITE_ORIGIN;

/**
 * Under a lock the popup and the worker share, so a link landing while the
 * popup clears another never loses either change.
 */
export const updateResults = (change) =>
  navigator.locks.request(RESULTS_KEY, async () => {
    const { [RESULTS_KEY]: results = {} } =
      await chrome.storage.local.get(RESULTS_KEY);
    await chrome.storage.local.set({ [RESULTS_KEY]: change(results) });
  });
