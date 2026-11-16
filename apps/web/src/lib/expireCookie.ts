/**
 * Deletes one of the site's own client-readable cookies in this browser
 * (path `/`, Lax, `Secure` on https, as the server sets them).
 */
export function expireCookie(name: string): void {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  // biome-ignore lint/suspicious/noDocumentCookie: the Cookie Store API is missing in older Safari; this only deletes our own cookie
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${secure}`;
}
