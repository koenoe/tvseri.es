/**
 * The Follow table's keys. One item per follow (`FOLLOW#<follower>#<following>`
 * as both `pk` and `sk`); gsi1 lists a user's followers
 * (`USER#<userId>#FOLLOWERS`) and gsi2 who a user follows
 * (`USER#<userId>#FOLLOWING`). Never change a format: stored items keep the
 * one they were written with.
 */
export const followPk = (followerId: string, followingId: string) =>
  `FOLLOW#${followerId}#${followingId}`;

/** gsi1: the people who follow `userId` */
export const followersPk = (userId: string) => `USER#${userId}#FOLLOWERS`;

/** gsi2: the people `userId` follows */
export const followingPk = (userId: string) => `USER#${userId}#FOLLOWING`;
