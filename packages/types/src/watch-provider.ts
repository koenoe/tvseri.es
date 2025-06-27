import * as v from 'valibot';

export const WatchProviderSchema = v.object({
  id: v.number(),
  logo: v.string(),
  logoPath: v.string(),
  name: v.string(),
});

export type WatchProvider = v.InferOutput<typeof WatchProviderSchema>;
