import {
  failedJson,
  notFoundJson,
  publicJson,
  unavailableJson,
} from '@/app/api/cacheHeaders';
import { isTmdbId } from '@/app/api/handlers';
import { isUnavailable } from '@/lib/cache/unavailable';
import { loadFamilyAndAwards } from '@/lib/person/loaders';

/**
 * Every award and nomination for a person's "All N nominations" sheet, read
 * when it opens so the list never rides along in the page's payload. Public
 * and CDN-cached like the loader: `medium` when Wikidata knows awards,
 * `short` when it knows none yet.
 */
export async function GET(
  _req: Request,
  { params }: Readonly<{ params: Promise<{ id: string }> }>,
) {
  const { id } = await params;
  if (!isTmdbId(id)) {
    return notFoundJson();
  }
  try {
    const data = await loadFamilyAndAwards(Number(id));
    if (isUnavailable(data)) {
      return unavailableJson();
    }
    const items = data.awards?.items ?? [];
    return publicJson(items, { life: items.length > 0 ? 'medium' : 'short' });
  } catch {
    return failedJson();
  }
}
