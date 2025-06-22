export type CacheOptions = Readonly<{
  ttl?: number | null; // null means no expiration
}>;

export type CacheItem = Readonly<{
  value: string;
  expiresAt?: number;
  createdAt: string;
}>;
