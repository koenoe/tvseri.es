import { NETFLIX_WATCH_PROVIDER } from '@tvseri.es/constants';
import { netflixRow } from '@tvseri.es/import';

import { readFailure } from '@/lib/connections/http';
import {
  cookiesFromSecret,
  jarSecret,
  secretFromCookies,
} from '@/lib/connections/jar';
import type { HistoryEntry, ServiceReader } from '@/lib/connections/reader';

import {
  netflixTestRead,
  openSession,
  readActivityPage,
} from './viewingActivity';

/** Netflix for the sync; an entry is remembered by its `movieID` */
export const netflixReader: ServiceReader = {
  label: 'NETFLIX SYNC',
  link: async (cookies) => {
    const read = await netflixTestRead(cookies);
    if (!read.ok) {
      return read;
    }
    return {
      latest: read.latest,
      ok: true,
      profileId: read.guid,
      profileName: read.profileName,
      secret: secretFromCookies(read.cookies),
      total: read.total,
    };
  },
  open: async (secret, profileId) => {
    const cookies = cookiesFromSecret(secret);
    if (!cookies) {
      return readFailure('read-failed');
    }
    const opened = await openSession(cookies);
    if (!opened.ok) {
      return opened;
    }
    const { session } = opened;
    return {
      ok: true,
      session: {
        readPage: async (page) => {
          const read = await readActivityPage(session, page, profileId);
          if (!read.ok) {
            return read;
          }
          const entries = read.page.items.map((item, index): HistoryEntry => {
            const entry = netflixRow(item, index);
            return {
              key: String(item.movieID),
              row: entry.kind === 'episode' ? entry.row : null,
              watchedAt: item.date,
            };
          });
          return { ok: true, page: { entries, invalid: read.page.invalid } };
        },
        // Netflix may renew cookies on any page
        get secret() {
          return jarSecret(session.jar, secret);
        },
      },
    };
  },
  watchProvider: NETFLIX_WATCH_PROVIDER,
};
