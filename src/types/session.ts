type Provider = 'internal' | 'tmdb';

export type Session = Readonly<{
  id: string;
  userId: string;
  provider: Provider;
  expiresAt: number;
  createdAt: string;
  clientIp: string;
  userAgent: string;
  version: number;
  tmdbSessionId?: string;
  tmdbAccessToken?: string;
}>;
