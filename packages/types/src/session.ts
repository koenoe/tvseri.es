import * as v from 'valibot';

const ProviderSchema = v.picklist(['internal', 'tmdb']);

export const SessionSchema = v.object({
  id: v.string(),
  userId: v.string(),
  provider: ProviderSchema,
  expiresAt: v.number(),
  createdAt: v.string(),
  clientIp: v.string(),
  region: v.optional(v.string()),
  country: v.optional(v.string()),
  city: v.optional(v.string()),
  userAgent: v.string(),
  version: v.number(),
  tmdbSessionId: v.optional(v.string()),
  tmdbAccessToken: v.optional(v.string()),
});

export const CreateOTPSchema = v.object({
  email: v.pipe(v.string(), v.email()),
});

export const CreateTmdbRequestTokenSchema = v.object({
  redirectUri: v.string(),
});

export const AuthenticateWithOTPSchema = v.object({
  email: v.pipe(v.string(), v.email()),
  otp: v.pipe(v.string(), v.length(6)),
  ...v.pick(SessionSchema, [
    'clientIp',
    'region',
    'country',
    'city',
    'userAgent',
  ]).entries,
});

export const AuthenticateWithTmdbSchema = v.object({
  requestToken: v.string(),
  ...v.pick(SessionSchema, [
    'clientIp',
    'region',
    'country',
    'city',
    'userAgent',
  ]).entries,
});

export type Provider = v.InferInput<typeof ProviderSchema>;
export type Session = v.InferInput<typeof SessionSchema>;
export type CreateOTP = v.InferOutput<typeof CreateOTPSchema>;
export type CreateTmdbRequestToken = v.InferOutput<
  typeof CreateTmdbRequestTokenSchema
>;
export type AuthenticateWithOTP = v.InferOutput<
  typeof AuthenticateWithOTPSchema
>;
export type AuthenticateWithTmdb = v.InferOutput<
  typeof AuthenticateWithTmdbSchema
>;
