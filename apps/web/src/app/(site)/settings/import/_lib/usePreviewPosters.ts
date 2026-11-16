'use client';

import { useEffect, useState } from 'react';

import { createSearchClient } from '@/lib/search/fetchSearch';
import { searchKey } from '@/lib/search/searchKey';

const client = createSearchClient();

/**
 * Poster thumbs for the Check table's few rows: each show's best search
 * match (`/api/search`, CDN-cached), by title. Decoration only: a miss keeps
 * the film-strip placeholder.
 */
export function usePreviewPosters(titles: ReadonlyArray<string>) {
  const [posters, setPosters] = useState<Readonly<Record<string, string>>>({});
  const key = titles.join('\n');

  // Fetching follows the titles on screen (a network subscription)
  useEffect(() => {
    if (!key) {
      return;
    }
    const controller = new AbortController();
    for (const title of key.split('\n')) {
      const query = searchKey(title);
      if (!query) {
        continue;
      }
      client
        .fetchSearch(query, controller.signal)
        .then((view) => {
          const poster = view.series[0]?.posterImage;
          if (poster) {
            setPosters((known) =>
              known[title] === poster ? known : { ...known, [title]: poster },
            );
          }
        })
        .catch(() => {});
    }
    return () => controller.abort();
  }, [key]);

  return posters;
}
