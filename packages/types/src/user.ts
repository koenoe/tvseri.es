import * as v from 'valibot';
import { WatchProviderSchema } from './watch-provider';

export const RoleSchema = v.picklist(['user', 'admin']);
export const UsernameSchema = v.pipe(
  v.string(),
  v.minLength(3),
  v.maxLength(128),
);

export const UserSchema = v.object({
  createdAt: v.string(),
  email: v.optional(v.pipe(v.string(), v.email())),
  id: v.string(),
  name: v.optional(v.string()),
  role: RoleSchema,
  tmdbAccountId: v.optional(v.number()),
  tmdbAccountObjectId: v.optional(v.string()),
  tmdbUsername: v.optional(v.string()),
  updatedAt: v.optional(v.string()),
  username: UsernameSchema,
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

export const CreateUserSchema = v.intersect([
  v.object({
    name: v.optional(v.string()),
    tmdbAccountId: v.optional(v.number()),
    tmdbAccountObjectId: v.optional(v.string()),
    tmdbUsername: v.optional(v.string()),
  }),
  v.union([
    v.object({
      email: v.optional(v.pipe(v.string(), v.email())),
      username: UsernameSchema,
    }),
    v.object({
      email: v.pipe(v.string(), v.email()),
      username: v.optional(UsernameSchema),
    }),
  ]),
]);

export const UpdateUserSchema = v.intersect([
  v.union([
    v.object({
      email: v.optional(v.pipe(v.string(), v.email())),
      name: v.optional(v.string()),
      username: UsernameSchema,
    }),
    v.object({
      email: v.pipe(v.string(), v.email()),
      name: v.optional(v.string()),
      username: v.optional(UsernameSchema),
    }),
  ]),
]);

export const AddTmdbToUserSchema = v.object({
  requestToken: v.string(),
});

export const UpdateWatchProvidersForUserSchema = v.object({
  watchProviders: v.array(WatchProviderSchema),
});

export type Role = v.InferOutput<typeof RoleSchema>;
export type User = v.InferOutput<typeof UserSchema>;
export type UserWithFollowInfo = v.InferOutput<typeof UserWithFollowInfoSchema>;
export type CreateUser = v.InferOutput<typeof CreateUserSchema>;
export type AddTmdbToUser = v.InferOutput<typeof AddTmdbToUserSchema>;
export type UpdateUser = v.InferOutput<typeof UpdateUserSchema>;
export type UpdateWatchProvidersForUser = v.InferOutput<
  typeof UpdateWatchProvidersForUserSchema
>;
