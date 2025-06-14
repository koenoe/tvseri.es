type Role = 'user' | 'admin';

export type User = Readonly<{
  id: string;
  createdAt: string;
  updatedAt?: string;
  email?: string;
  name?: string;
  role: Role;
  tmdbAccountId?: number;
  tmdbAccountObjectId?: string;
  tmdbUsername?: string;
  username: string;
  version: number;
}>;

export type UserWithFollowInfo = User &
  Readonly<{
    isFollowing: boolean;
    isFollower: boolean;
    isMe: boolean;
    followingCount: number;
    followerCount: number;
  }>;
