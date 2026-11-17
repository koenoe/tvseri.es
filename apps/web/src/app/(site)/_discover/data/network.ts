import 'server-only';

import type { Network } from '@tvseri.es/schemas';
import { cacheTag } from 'next/cache';

import { apiFetch } from '@/lib/api/client';
import { tags } from '@/lib/cache/tags';
import {
  cacheLifeFor,
  isUnavailable,
  tryApi,
  type Unavailable,
} from '@/lib/cache/unavailable';
import { imageRatio } from '@/lib/imageRatio';

/** What the network hero and the hub's Essentials title need from `GET /network/:id` */
export type NetworkDetails = Readonly<{
  /** TMDB's logo (w500), null when TMDB has none: then the name is the title */
  logo: string | null;
  /** the logo's width / height, read from the file, so its box is sized before it loads; null when unknown */
  logoRatio: number | null;
  /** false when the logo can't be drawn white (a filled block): it goes on a light chip */
  logoSilhouette: boolean;
  /** "United States" */
  country: string | null;
}>;

/**
 * The network's logo and origin country (`GET /network/:id`), cached
 * `long` like the API: one entry per network for every page that shows it.
 * Null when TMDB has no such network.
 */
export async function getNetworkDetails(
  id: number,
): Promise<NetworkDetails | null | Unavailable> {
  'use cache';
  cacheTag(tags.network(id));

  const network = await tryApi(() =>
    apiFetch<Network>('/network/:id', { notFound: 'null', params: { id } }),
  );
  cacheLifeFor('long', network);
  if (isUnavailable(network)) {
    return network;
  }
  if (!network) {
    return null;
  }
  return {
    country: network.originCountry?.name ?? null,
    logo: network.logo,
    logoRatio: network.logo ? await readLogoRatio(network.logo) : null,
    // unchecked (absent) is drawn white, as before the check
    logoSilhouette: network.logoSilhouette !== false,
  };
}

/** A logo's width / height when its file couldn't be read (a typical wordmark) */
export const DEFAULT_LOGO_RATIO = 4;

/** Bytes enough for a PNG's header or an SVG's opening tag */
const HEAD_BYTES = 4096;
const LOGO_TIMEOUT = 3000;

/**
 * A logo's width / height from the file's first bytes (`imageRatio`); null
 * when the image host doesn't answer in time (the logo then sizes itself
 * when it loads, as before).
 */
async function readLogoRatio(url: string): Promise<number | null> {
  try {
    const response = await fetch(url, {
      headers: { range: `bytes=0-${HEAD_BYTES - 1}` },
      signal: AbortSignal.timeout(LOGO_TIMEOUT),
    });
    if (!response.ok) {
      return null;
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    return imageRatio(bytes.subarray(0, HEAD_BYTES));
  } catch {
    return null;
  }
}
