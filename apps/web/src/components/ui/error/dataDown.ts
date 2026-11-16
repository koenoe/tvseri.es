/**
 * The data-down seam. Production error boundaries only see an error's
 * `digest`, and Next keeps a digest the thrown error already has, so a
 * `DataDownError` reaches the boundary recognisably and it shows “Our show
 * data is on a break.” instead of the 500.
 */
export const DATA_DOWN_DIGEST = 'TVSERIES_DATA_DOWN';

export class DataDownError extends Error {
  readonly digest = DATA_DOWN_DIGEST;

  constructor(options?: ErrorOptions) {
    super('The API or TMDB is not answering', options);
    this.name = 'DataDownError';
  }
}

/** True for a `DataDownError`, also after it crossed to the client. */
export function isDataDown(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    error.digest === DATA_DOWN_DIGEST
  );
}
