import { createAuthServerFetch } from '@tvseri.es/utils';

/**
 * The dashboard's OpenAuth fetch (`createAuthServerFetch`): only an OAuth
 * `invalid_grant` signs the admin out, an outage never does.
 */
export const authServerFetch = createAuthServerFetch(10_000);
