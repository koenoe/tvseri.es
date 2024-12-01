type Role = 'user' | 'admin';

export type User = Readonly<{
  id: string;
  createdAt: string;
  email?: string;
  name?: string;
  role: Role;
  tmdbAccountId?: number;
  tmdbAccountObjectId?: string;
  tmdbUsername?: string;
  username: string;
  version: number;
}>;
