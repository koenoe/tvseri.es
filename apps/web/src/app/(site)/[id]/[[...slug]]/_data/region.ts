import 'server-only';

import type { WatchProvider } from '@tvseri.es/schemas';
import { cache } from 'react';

import auth from '@/auth';
import { resolveRegion } from '@/lib/geo';

/**
 * The viewer's region (saved country, else the geo header, `lib/geo`) and
 * streaming services, once per request. Reads the session and headers:
 * call it inside a Suspense hole only.
 */
export const getViewerRegion = cache(
  async (): Promise<
    Readonly<{ region: string; services: ReadonlyArray<WatchProvider> }>
  > => {
    const { user } = await auth();
    return {
      region: await resolveRegion(user),
      services: user?.watchProviders ?? [],
    };
  },
);
