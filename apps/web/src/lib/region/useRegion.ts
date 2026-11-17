'use client';

import { useSyncExternalStore } from 'react';
import * as v from 'valibot';

import { readDisplayUsername } from '@/auth/displayUsername';
import { WIDE } from '@/lib/media/breakpoints';
import { matchesNow, subscribeMediaQuery } from '@/lib/media/useMediaQuery';
import {
  REGION_HINT_KEY,
  REGION_HINT_MAX_AGE_MS,
  REGION_HINT_VERSION,
  readRegionHint,
} from './regionHint';
import { regionUrl } from './regionUrl';

const RegionSchema = v.object({ region: v.pipe(v.string(), v.length(2)) });

/** Answers per viewer, shared by every caller in the tab */
const regions = new Map<string | null, string>();
/** Viewers whose stored hint was already read (fresh or not) */
const checked = new Set<string | null>();
const inFlight = new Set<string | null>();
const listeners = new Set<() => void>();

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const currentUser = () => readDisplayUsername(document.cookie);

/** This viewer's region: in memory, else the browser's fresh stored hint */
function known(user: string | null): string | null {
  const region = regions.get(user);
  if (region || checked.has(user)) {
    return region ?? null;
  }
  checked.add(user);
  const stored = readRegionHint(
    storage(),
    user,
    Date.now(),
    REGION_HINT_KEY,
    REGION_HINT_VERSION,
    REGION_HINT_MAX_AGE_MS,
  );
  if (stored) {
    regions.set(user, stored);
  }
  return stored;
}

function store(user: string | null, region: string) {
  regions.set(user, region);
  try {
    storage()?.setItem(
      REGION_HINT_KEY,
      JSON.stringify({
        r: region,
        t: Date.now(),
        u: user ?? '',
        v: REGION_HINT_VERSION,
      }),
    );
  } catch {
    // full or blocked storage: the next document asks again
  }
  for (const listener of listeners) {
    listener();
  }
}

async function load(user: string | null, cache?: RequestCache): Promise<void> {
  if (inFlight.has(user)) {
    return;
  }
  inFlight.add(user);
  try {
    const response = await fetch(regionUrl(user), {
      cache,
      credentials: 'same-origin',
    });
    const parsed = v.safeParse(RegionSchema, await response.json());
    if (response.ok && parsed.success) {
      store(user, parsed.output.region);
    }
  } catch {
    // No line rather than a wrong one; the next mount asks again.
  } finally {
    inFlight.delete(user);
  }
}

/** Where the Discover line shows (`md:`); phones never ask. No `matchMedia`: ask */
const isWide = () =>
  typeof window.matchMedia !== 'function' || matchesNow(WIDE);

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const request = () => {
    const user = currentUser();
    if (isWide() && !known(user)) {
      void load(user);
    }
  };
  request();
  // the app's shared listener for the query, not one per reader
  const unfollow = subscribeMediaQuery(WIDE, request);
  return () => {
    listeners.delete(onChange);
    unfollow();
  };
}

const getSnapshot = () => known(currentUser());
const getServerSnapshot = () => null;

/**
 * The viewer's region code, `null` until it is known (always on the server
 * and during hydration, so the cached page is the same for everyone). The
 * answer is kept on this browser for a day (`lib/region/regionHint`): the
 * pre-paint script draws it before React does, and `/api/region` is asked
 * at most once a day, only on wide screens (where the line shows).
 */
export function useRegion(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Asks again past the stored copy (and the browser's), e.g. after the
 * viewer saved another country in Settings.
 */
export function refreshRegion(): Promise<void> {
  return load(currentUser(), 'reload');
}
