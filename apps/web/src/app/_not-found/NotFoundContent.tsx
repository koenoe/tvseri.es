import { cacheLife } from 'next/cache';
import type { ReactNode } from 'react';

import NotFoundView from '@/components/ui/error/NotFoundView';
import { NOT_FOUND_STILLS } from '@/components/ui/error/stills';

import { loadTrending } from './trending';

/**
 * One of the three 404 stills, picked inside the cache so it rotates without
 * a request or a client-side swap.
 */
async function pickStillIndex() {
  'use cache';
  cacheLife('short');
  return Math.floor(Math.random() * NOT_FOUND_STILLS.length);
}

/**
 * The static 404: no cookies, no params, no request data.
 * The still and the trending shows are both cached, so it stays
 * prerendered. `header` only where no site layout draws one (the root).
 */
export default async function NotFoundContent({
  header,
}: Readonly<{ header?: ReactNode }>) {
  const [index, shows] = await Promise.all([pickStillIndex(), loadTrending()]);
  const still = NOT_FOUND_STILLS[index] ?? NOT_FOUND_STILLS[0];
  return <NotFoundView header={header} shows={shows} still={still} />;
}
