import {
  MAX_WATCH_PROVIDERS,
  type WatchProvider,
  type WatchProviderInput,
  WatchProviderInputSchema,
} from '@tvseri.es/schemas';
import { buildLogoImageUrl } from '@tvseri.es/utils';
import * as v from 'valibot';

/** A service as stored and served: `logo` always built here from `logoPath` */
export const toWatchProvider = ({
  color,
  id,
  logoPath,
  name,
}: WatchProviderInput): WatchProvider => ({
  ...(color && { color }),
  id,
  logo: logoPath ? buildLogoImageUrl(logoPath) : '',
  logoPath,
  name,
});

/**
 * A user's stored services as served: the ones that pass the input schema
 * (older writes weren't validated), at most MAX_WATCH_PROVIDERS, with the
 * logo rebuilt. Read-only: the stored item is never rewritten.
 */
export const readWatchProviders = (
  stored: unknown,
): WatchProvider[] | undefined => {
  if (!Array.isArray(stored)) {
    return undefined;
  }
  return stored
    .flatMap((item) => {
      const parsed = v.safeParse(WatchProviderInputSchema, item);
      return parsed.success ? [toWatchProvider(parsed.output)] : [];
    })
    .slice(0, MAX_WATCH_PROVIDERS);
};
