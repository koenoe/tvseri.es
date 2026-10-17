/**
 * Result type for server actions. Isomorphic (no server imports), so client
 * components can import the helpers to interpret a result.
 */
export type ActionError =
  | 'unauthenticated'
  | 'invalid'
  | 'not-found'
  | 'failed';

export type ActionResult = Readonly<
  { ok: true } | { ok: false; error: ActionError }
>;

export const ACTION_OK: ActionResult = { ok: true };

export const actionError = (error: ActionError): ActionResult => ({
  error,
  ok: false,
});

export function getActionErrorMessage(
  error: ActionError,
  fallback = 'Something went wrong. Please try again.',
) {
  return error === 'unauthenticated' ? 'Please log in first.' : fallback;
}
