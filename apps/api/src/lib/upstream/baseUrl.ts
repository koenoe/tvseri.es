import { isLocalHost } from '@tvseri.es/constants';
import { Resource } from 'sst';

import { logWarn } from '@/utils/logWarn';

/**
 * The load rig's seam (tools/load): `TMDB_BASE_URL`, `MDBLIST_BASE_URL` or
 * `OMDB_BASE_URL` points that client at a stub upstream instead of the real
 * service. Honoured ONLY when it is http(s) on localhost or 127.0.0.1, and
 * never on the production stage: anything else is ignored (logged), so a
 * stray variable can neither send keys to another host nor reroute
 * production. Unset, the real base URL is used.
 */
export type UpstreamName = 'MDBLIST' | 'OMDB' | 'TMDB';

const stageOf = () => {
  try {
    return Resource.App.stage;
  } catch {
    return undefined;
  }
};

/** Whether `override` may replace a real base URL on `stage` */
export const isAllowedOverride = (
  override: string,
  stage: string | undefined,
): boolean => {
  if (stage === 'production') {
    return false;
  }
  try {
    const url = new URL(override);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      isLocalHost(url.hostname)
    );
  } catch {
    return false;
  }
};

export const upstreamBaseUrl = (name: UpstreamName, real: string): string => {
  const override = process.env[`${name}_BASE_URL`];
  if (!override) {
    return real;
  }
  if (!isAllowedOverride(override, stageOf())) {
    logWarn(`${name}_BASE_URL ignored`, 'only localhost, never in production');
    return real;
  }
  return override;
};
