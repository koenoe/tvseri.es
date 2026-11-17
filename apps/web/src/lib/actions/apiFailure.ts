import 'server-only';

import { ApiError } from '@/lib/api/client';

import { type ActionError, actionError } from './result';

/** An API status's error word, or one only for a given API error `code` */
type Override<E extends string> = E | Readonly<{ code: string; error: E }>;

type StatusMap<E extends string> = Readonly<
  Partial<Record<number, Override<E>>>
>;

/** Every action: a 401 is signed out, a 404 is gone */
const BASE: StatusMap<ActionError> = {
  401: 'unauthenticated',
  404: 'not-found',
};

function mapped<E extends string>(
  error: ApiError,
  statuses: StatusMap<E>,
): E | ActionError | null {
  const override = statuses[error.status];
  if (typeof override === 'string') {
    return override;
  }
  if (override && override.code === error.code) {
    return override.error;
  }
  const base = BASE[error.status];
  return typeof base === 'string' ? base : null;
}

/**
 * An action's answer to a failed API call: the error word for its status
 * (401 signed out, 404 not found, plus the action's own `statuses`, which
 * win), else `failed`, logged under `[label]` with the status only (never
 * the response body); an error that isn't the API's is logged as it is.
 *
 * @example
 * catch (error) {
 *   return apiFailure('plex', error, { 400: 'invalid' });
 * }
 */
export function apiFailure<E extends string = never>(
  label: string,
  error: unknown,
  statuses: StatusMap<E> = {},
) {
  const word = error instanceof ApiError ? mapped(error, statuses) : null;
  if (word && word !== 'failed') {
    return actionError(word);
  }
  console.error(`[${label}]`, error instanceof ApiError ? error.status : error);
  return actionError<ActionError>('failed');
}
