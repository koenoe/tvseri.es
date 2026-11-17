import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/api/client', () => {
  class ApiError extends Error {
    constructor(
      readonly status: number,
      readonly code?: string,
    ) {
      super(code ?? `API request failed with status ${status}`);
    }
  }
  return { ApiError };
});

const { ApiError } = await import('@/lib/api/client');
const { apiFailure } = await import('./apiFailure');

/** Each action's statuses, as the actions pass them */
const SITES = {
  deleteAccount: { 400: 'mismatch', 404: 'failed' },
  import: { 400: 'invalid', 409: 'invalid' },
  marking: {},
  plex: { 400: 'invalid' },
  settings: { 409: { code: 'UsernameAlreadyTaken', error: 'taken' } },
} as const;

let log: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  log = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => log.mockRestore());

describe('apiFailure: the error word per action and status', () => {
  it.each([
    ['settings', 401, undefined, 'unauthenticated'],
    ['settings', 404, undefined, 'not-found'],
    ['settings', 409, 'UsernameAlreadyTaken', 'taken'],
    ['settings', 409, 'Other', 'failed'],
    ['settings', 400, undefined, 'failed'],
    ['plex', 400, undefined, 'invalid'],
    ['plex', 404, undefined, 'not-found'],
    ['plex', 409, undefined, 'failed'],
    ['import', 400, undefined, 'invalid'],
    ['import', 409, 'ImportNotOpen', 'invalid'],
    ['import', 404, undefined, 'not-found'],
    ['deleteAccount', 400, undefined, 'mismatch'],
    ['deleteAccount', 404, undefined, 'failed'],
    ['deleteAccount', 401, undefined, 'unauthenticated'],
    ['marking', 401, undefined, 'unauthenticated'],
    ['marking', 404, undefined, 'not-found'],
    ['marking', 500, undefined, 'failed'],
  ] as const)('%s: %i %s → %s', (site, status, code, expected) => {
    expect(apiFailure(site, new ApiError(status, code), SITES[site])).toEqual({
      error: expected,
      ok: false,
    });
  });

  it('logs a failure with its label and status only, never the body', () => {
    apiFailure('plex', new ApiError(500, 'secret detail'));
    expect(log).toHaveBeenCalledWith('[plex]', 500);
  });

  it('logs an error that is not the API’s as it is', () => {
    const error = new TypeError('boom');
    expect(apiFailure('import', error)).toEqual({ error: 'failed', ok: false });
    expect(log).toHaveBeenCalledWith('[import]', error);
  });

  it('does not log an answer it maps', () => {
    apiFailure('plex', new ApiError(401));
    expect(log).not.toHaveBeenCalled();
  });
});
