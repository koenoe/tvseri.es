import { encodeToBase64Url } from './stringBase64Url';
import toSlug from './toSlug';

/**
 * The Users table's keys. The auth service writes a new user and the API
 * reads, renames and deletes one, so both build every key here.
 *
 * - `USER#<id>`: the user item (`pk`);
 * - `EMAIL#<base64url email>`: the user's `gsi1pk`, and the `pk` of the
 *   email's claim item (`{ pk, userId }`), written with every new user so
 *   one address can never get two accounts;
 * - `USERNAME#<username>`: the user's `gsi2pk`;
 * - `HANDLE#<username>`: the username's claim item (`{ pk, userId }`).
 */
export const USER_KEY_PREFIX = 'USER#';

export const userKey = (userId: string) => `${USER_KEY_PREFIX}${userId}`;

/** An address as stored and looked up: trimmed, lowercase */
export const normaliseEmail = (email: string) => email.trim().toLowerCase();

export const emailKey = (email: string) =>
  `EMAIL#${encodeToBase64Url(normaliseEmail(email))}`;

/**
 * A username's index key. Lookups take what someone typed; a stored
 * username is already in this slug form (`UsernameSchema`, generated
 * handles), so writes get the same key.
 */
export const usernameKey = (username: string) => `USERNAME#${toSlug(username)}`;

/**
 * A username's claim: deleted only by the user it names, so sign-up and
 * rename always claim the same item.
 */
export const handleClaimKey = (username: string) => `HANDLE#${username}`;
