/**
 * Cache tags of a user's public stats. Every stats read is tagged with both:
 * `user:{id}` for manual invalidation (plan: Stats cache), `stats:{id}` for
 * the owner's own marks (`revalidateViewerStats`), so a mark doesn't expire
 * anything else tagged with the user.
 */
export const userTag = (userId: string) => `user:${userId}`;

export const statsTag = (userId: string) => `stats:${userId}`;

/** The username → user lookup (renames drop it) */
export const usernameTag = (username: string) => `username:${username}`;
