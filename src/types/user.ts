type Role = 'user' | 'admin';

export type User = Readonly<{
  id: string;
  createdAt: string;
  email?: string;
  name?: string;
  role: Role;
  tmdbAccountId?: string;
  tmdbAccountObjectId?: string;
  username?: string;
  version: number;
}>;
