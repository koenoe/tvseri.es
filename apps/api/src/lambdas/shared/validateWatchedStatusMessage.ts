import type { User } from '@tvseri.es/schemas';

/** SQS message body: sent by validateWatchedStatusCron, read by validateWatchedStatusQueue */
export type ValidateWatchedStatusMessage = Readonly<Pick<User, 'id'>>;
