import {
  failedJson,
  notFoundJson,
  publicJson,
  unavailableJson,
} from '@/app/api/cacheHeaders';
import { isTmdbId } from '@/app/api/handlers';
import { isUnavailable } from '@/lib/cache/unavailable';
import { loadPerson, loadShowsView } from '@/lib/person/loaders';

/**
 * A person's folded "As himself" credits, read when the viewer opens them so
 * they never ride along in the page's payload. Public and CDN-cached for the
 * page's own life (`medium`); the label's gender comes from the same cached
 * person read as the page, so the URL is one per person.
 */
export async function GET(
  _req: Request,
  { params }: Readonly<{ params: Promise<{ id: string }> }>,
) {
  const { id } = await params;
  if (!isTmdbId(id)) {
    return notFoundJson();
  }
  const personId = Number(id);
  try {
    const person = await loadPerson(personId);
    if (isUnavailable(person)) {
      return unavailableJson();
    }
    if (person.status === 'not-found') {
      return notFoundJson('short');
    }
    const view = await loadShowsView(personId, person.person.gender);
    if (isUnavailable(view)) {
      return unavailableJson();
    }
    return publicJson(view?.self ?? [], { life: 'medium' });
  } catch {
    return failedJson();
  }
}
