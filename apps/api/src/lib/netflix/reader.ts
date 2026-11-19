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
  readFinished,
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
          const rows = read.page.items.map((item, index) => ({
            item,
            row: netflixRow(item, index),
          }));
          // Positions are the session's profile's: for another profile none
          // can be known, so nothing is marked on a guess
          const finished =
            session.guid === profileId
              ? await readFinished(
                  session,
                  rows.flatMap(({ item, row }) =>
                    row.kind === 'episode' ? [item.movieID] : [],
                  ),
                )
              : { finished: new Set<number>(), ok: true as const };
          if (!finished.ok) {
            return finished;
          }
          const entries = rows.map(({ item, row }): HistoryEntry => {
            const key = String(item.movieID);
            if (row.kind !== 'episode') {
              return { key, row: null, watchedAt: item.date };
            }
            // Played but not to the end: read past, never marked
            return finished.finished.has(item.movieID)
              ? { key, row: row.row, watchedAt: item.date }
              : { key, row: null, unfinished: true, watchedAt: item.date };
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
