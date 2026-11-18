'use client';

import {
  type ReadonlyURLSearchParams,
  usePathname,
  useSearchParams,
} from 'next/navigation';
import { useState } from 'react';

/**
 * The show page's own query (`?season`, `?episode`, `?history`, `?images`).
 *
 * Next keeps the last pages mounted but hidden (React Activity, its
 * back/forward cache), and `useSearchParams` hands every one of them the URL
 * the router shows now. On a person page opened from the episode modal, the
 * hidden show page would read "no episode" and close the modal; Back would
 * then reopen it, grown from its tile, and leave it there, small. While another page
 * shows, this keeps the query this page last had, so a hidden page changes
 * nothing and comes back as it was left.
 */
export default function useShowQuery(showId: number): ReadonlyURLSearchParams {
  const query = useSearchParams();
  const own = usePathname().split('/')[1] === String(showId);
  const [kept, setKept] = useState(query);
  if (own && kept !== query) {
    setKept(query);
  }
  return own ? query : kept;
}
