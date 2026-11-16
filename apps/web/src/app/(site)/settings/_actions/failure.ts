import { ApiError } from '@/lib/api/client';

import { fail } from './result';

/**
 * An API failure as the action's answer: signed out, a taken username, or a
 * plain failure. Logs the status only, never the body.
 */
export function failure(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return fail('unauthenticated');
    }
    if (error.status === 409 && error.code === 'UsernameAlreadyTaken') {
      return fail('taken');
    }
    if (error.status === 404) {
      return fail('not-found');
    }
  }
  console.error('[settings]', error instanceof ApiError ? error.status : error);
  return fail('failed');
}
