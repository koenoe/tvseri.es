import auth from '@/auth';
import { getRegion } from '@/lib/geo';

/**
 * Region used for watch providers on discover: the user's country, else the visitor's IP country.
 * Shared by the provider filter and the results, so both use the same region.
 */
export default async function getWatchRegion() {
  const [{ user }, region] = await Promise.all([auth(), getRegion()]);
  return user?.country ?? region;
}
