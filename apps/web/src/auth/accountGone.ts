/**
 * The API's 401 code for a token whose user is deleted or being deleted, also
 * the `error` of the web's own 401 that passes it on to the browser
 * (`/api/me/library-ids`). No `server-only`: the browser reads it too.
 */
export const ACCOUNT_GONE = 'AccountGone';
