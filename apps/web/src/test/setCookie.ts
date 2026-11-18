/**
 * Writes one cookie in a jsdom test. jsdom has no Cookie Store API and the code
 * under test reads `document.cookie` synchronously, so tests play the browser
 * (or the auth callback) through this helper.
 */
export const setCookie = (cookie: string): void => {
  // biome-ignore lint/suspicious/noDocumentCookie: jsdom has no Cookie Store API; the code under test reads document.cookie
  document.cookie = cookie;
};
