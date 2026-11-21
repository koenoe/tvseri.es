import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

import { InvalidCursorError } from '@/lib/db/cursor';
import { ProfileUpdateConflictError } from '@/lib/db/user';
import { IncompletePoolError } from '@/lib/duration';
import {
  NoSeasonsError,
  SeasonNotAiredError,
  TooManyEpisodesError,
} from '@/lib/watchLog/errors';

type ErrorClass = new (...args: never[]) => Error;

/** The HTTP status of each error the data layer throws for a client to see */
const STATUSES: ReadonlyArray<readonly [ErrorClass, ContentfulStatusCode]> = [
  [InvalidCursorError, 400],
  [NoSeasonsError, 400],
  [SeasonNotAiredError, 400],
  [ProfileUpdateConflictError, 409],
  [TooManyEpisodesError, 413],
  [IncompletePoolError, 503],
];

/**
 * The data layer's error as the HTTPException its route answers with, same
 * message; undefined for any other error. The lib code stays free of HTTP.
 */
export const toHttpException = (error: Error): HTTPException | undefined => {
  const status = STATUSES.find(([errorClass]) => error instanceof errorClass);
  return status && new HTTPException(status[1], { message: error.message });
};
