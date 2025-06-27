import * as v from 'valibot';

const ProviderSchema = v.picklist(['internal', 'tmdb']);

export const SessionSchema = v.object({
  city: v.optional(v.string()),
  clientIp: v.string(),
  country: v.optional(v.string()),
  createdAt: v.string(),
  expiresAt: v.number(),
  id: v.string(),
  provider: ProviderSchema,
  region: v.optional(v.string()),
  tmdbAccessToken: v.optional(v.string()),
  tmdbSessionId: v.optional(v.string()),
  userAgent: v.string(),
  userId: v.string(),
  version: v.number(),
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
