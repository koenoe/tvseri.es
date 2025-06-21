import * as v from 'valibot';

export const WatchProviderSchema = v.object({
  id: v.number(),
  name: v.string(),
  logo: v.string(),
  logoPath: v.string(),
});

export type WatchProvider = v.InferOutput<typeof WatchProviderSchema>;
