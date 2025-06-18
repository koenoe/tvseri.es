import * as v from 'valibot';

export const RoleSchema = v.picklist(['user', 'admin']);
export const UsernameSchema = v.pipe(
  v.string(),
  v.minLength(3),
  v.maxLength(128),
);

export const UserSchema = v.object({
  id: v.string(),
  createdAt: v.string(),
  updatedAt: v.optional(v.string()),
  email: v.optional(v.pipe(v.string(), v.email())),
  name: v.optional(v.string()),
  role: RoleSchema,
  tmdbAccountId: v.optional(v.number()),
  tmdbAccountObjectId: v.optional(v.string()),
  tmdbUsername: v.optional(v.string()),
  username: UsernameSchema,
  version: v.number(),
});

export const UserWithFollowInfoSchema = v.object({
  ...UserSchema.entries,
  isFollowing: v.boolean(),
  isFollower: v.boolean(),
  isMe: v.boolean(),
  followingCount: v.number(),
  followerCount: v.number(),
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
      username: UsernameSchema,
      email: v.optional(v.pipe(v.string(), v.email())),
    }),
    v.object({
      username: v.optional(UsernameSchema),
      email: v.pipe(v.string(), v.email()),
    }),
  ]),
]);

// Export the inferred types for backward compatibility
export type Role = v.InferOutput<typeof RoleSchema>;
export type User = v.InferOutput<typeof UserSchema>;
export type UserWithFollowInfo = v.InferOutput<typeof UserWithFollowInfoSchema>;
export type CreateUser = v.InferOutput<typeof CreateUserSchema>;
