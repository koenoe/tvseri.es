import * as v from 'valibot';
import { WatchProviderSchema } from './watch-provider';

export const RoleSchema = v.picklist(['user', 'admin']);
export const UsernameSchema = v.pipe(
  v.string(),
  v.minLength(3),
  v.maxLength(128),
);

export const UserSchema = v.object({
  country: v.optional(v.string()),
  createdAt: v.string(),
  email: v.optional(v.pipe(v.string(), v.email())),
  followerCount: v.optional(v.number()),
  followingCount: v.optional(v.number()),
  id: v.string(),
  name: v.optional(v.string()),
  role: RoleSchema,
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

export const UpdateWatchProvidersForUserSchema = v.object({
  watchProviders: v.array(WatchProviderSchema),
});

export type Role = v.InferOutput<typeof RoleSchema>;
export type User = v.InferOutput<typeof UserSchema>;
export type UserWithFollowInfo = v.InferOutput<typeof UserWithFollowInfoSchema>;
export type UpdateUser = v.InferOutput<typeof UpdateUserSchema>;
export type UpdateWatchProvidersForUser = v.InferOutput<
  typeof UpdateWatchProvidersForUserSchema
>;
