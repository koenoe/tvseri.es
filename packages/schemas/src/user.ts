import * as v from 'valibot';
import { LastImportSchema } from './import';
import {
  MAX_WATCH_PROVIDERS,
  WatchProviderInputSchema,
  WatchProviderSchema,
} from './watch-provider';

export const RoleSchema = v.picklist(['user', 'admin']);

/**
 * Handles nobody can take: they would read as the site speaking, a role or
 * a page. Checked on a new or changed username only; a stored one is never
 * re-validated.
 */
const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  'abuse',
  'admin',
  'administrator',
  'anonymous',
  'api',
  'auth',
  'dashboard',
  'help',
  'login',
  'logout',
  'me',
  'mod',
  'moderator',
  'null',
  'official',
  'owner',
  'root',
  'security',
  'settings',
  'signin',
  'signup',
  'staff',
  'support',
  'system',
  'team',
  'tvseri-es',
  'tvseries',
  'undefined',
]);

export const isReservedUsername = (username: string): boolean =>
  RESERVED_USERNAMES.has(username);

/**
 * The longest username a person can choose: a generated
 * handle is at most 25 ("honorable-hummingbird-000"). Usernames chosen
 * before the cap (up to 128) stay valid to read and are never rewritten:
 * only a new choice is checked (`UsernameSchema`).
 */
export const USERNAME_MAX_LENGTH = 30;

/** What the form and the API say about a username past the cap */
export const USERNAME_TOO_LONG = `Use ${USERNAME_MAX_LENGTH} characters or fewer.`;

/** A username's shape: lowercase letters and digits in groups joined by single hyphens */
const USERNAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * A new username: its own URL slug (`/u/<username>`), lowercase letters and
 * digits in groups joined by single hyphens, 3 to 30 characters. Lookups
 * slugify, so anything else would be unfindable. For writes only: reads take
 * any stored username.
 */
export const UsernameSchema = v.pipe(
  v.string(),
  v.minLength(3),
  v.maxLength(USERNAME_MAX_LENGTH, USERNAME_TOO_LONG),
  v.regex(USERNAME_PATTERN, 'Use lowercase letters, digits and single hyphens'),
  v.check((username) => !isReservedUsername(username), 'That name is reserved'),
);

/**
 * A handle as someone types it into search to find a member: an optional
 * leading `@`, any case (usernames are stored lowercase), 3 to
 * `USERNAME_MAX_LENGTH` characters like `UsernameSchema`. Exact match only:
 * never a prefix.
 */
export const MemberHandleSchema = v.pipe(
  v.string(),
  v.trim(),
  v.toLowerCase(),
  v.transform((input) => input.replace(/^@/, '')),
  v.minLength(3),
  v.maxLength(USERNAME_MAX_LENGTH),
  v.regex(USERNAME_PATTERN),
);

/** `GET /me/member?username=`: the exact-handle lookup behind search */
export const MemberLookupQuerySchema = v.object({
  username: MemberHandleSchema,
});

/** A member found by their handle: nothing but the id and the handle */
export const MemberMatchSchema = v.object({
  id: v.string(),
  username: v.string(),
});

export type MemberMatch = v.InferOutput<typeof MemberMatchSchema>;

/** ISO 3166-1 alpha-2 country code, e.g. `GB` */
export const CountryCodeSchema = v.pipe(
  v.string(),
  v.regex(/^[A-Z]{2}$/, 'Expected an ISO 3166-1 alpha-2 code like GB'),
);

export const UserSchema = v.object({
  country: v.optional(v.string()),
  createdAt: v.string(),
  email: v.optional(v.pipe(v.string(), v.email())),
  followerCount: v.optional(v.number()),
  followingCount: v.optional(v.number()),
  /** When all Get started steps were first done (epoch ms) */
  getStartedDoneAt: v.optional(v.number()),
  id: v.string(),
  lastImport: v.optional(LastImportSchema),
  name: v.optional(v.string()),
  role: RoleSchema,
  updatedAt: v.optional(v.string()),
  /**
   * Not `UsernameSchema`: the slug rule is for writes. A stored username from
   * before it must still parse, or `GET /me` fails and its owner is signed out.
   */
  username: v.string(),
  version: v.number(),
  watchProviders: v.optional(v.array(WatchProviderSchema)),
});

export const UserWithFollowInfoSchema = v.object({
  ...UserSchema.entries,
  followerCount: v.number(),
  followingCount: v.number(),
  isFollower: v.boolean(),
  isFollowing: v.boolean(),
  isMe: v.boolean(),
});

/**
 * `PUT /me`: only the fields sent change (at least one). `country` is the
 * region that decides services and release dates.
 */
export const UpdateUserSchema = v.pipe(
  v.object({
    country: v.optional(CountryCodeSchema),
    name: v.optional(v.pipe(v.string(), v.maxLength(128))),
    username: v.optional(UsernameSchema),
  }),
  v.check(
    (input) =>
      input.country !== undefined ||
      input.name !== undefined ||
      input.username !== undefined,
    'Nothing to update',
  ),
);

export const UpdateWatchProvidersForUserSchema = v.object({
  watchProviders: v.pipe(
    v.array(WatchProviderInputSchema),
    v.maxLength(MAX_WATCH_PROVIDERS),
  ),
});

export type Role = v.InferOutput<typeof RoleSchema>;
export type User = v.InferOutput<typeof UserSchema>;
export type UserWithFollowInfo = v.InferOutput<typeof UserWithFollowInfoSchema>;
export type UpdateUser = v.InferOutput<typeof UpdateUserSchema>;
export type UpdateWatchProvidersForUser = v.InferOutput<
  typeof UpdateWatchProvidersForUserSchema
>;

/** `GET /me/get-started`: the card's three steps */
/** `GET /me/get-started`: the web checks the answer's shape before it draws it */
export const GetStartedStatusSchema = v.object({
  /** When all three were first done (epoch ms) */
  doneAt: v.nullable(v.number()),
  doneCount: v.number(),
  /** Gone: 3 days after done, or 30 days after sign-up */
  hidden: v.boolean(),
  steps: v.object({
    /** At least one show in Finished (e.g. marked "Already seen") */
    alreadySeen: v.boolean(),
    /** An import (not undone) or Plex connected */
    history: v.boolean(),
    /** At least one streaming service picked */
    services: v.boolean(),
  }),
});

export type GetStartedStatus = Readonly<
  Omit<v.InferOutput<typeof GetStartedStatusSchema>, 'steps'> & {
    steps: Readonly<v.InferOutput<typeof GetStartedStatusSchema>['steps']>;
  }
>;

/** `DELETE /me`: the username, typed to confirm */
export const DeleteAccountSchema = v.object({
  confirm: v.pipe(v.string(), v.maxLength(128)),
});
