import type { PersonShows } from '@tvseri.es/schemas';

import { isUnavailable, type Unavailable } from '@/lib/cache/unavailable';

/**
 * Whether a person has any TV credit (a series, an upcoming one, an "as
 * himself" appearance): without one, Career, Shows and Frequent
 * collaborators would render nothing, so the page doesn't lay out their
 * placeholders either (a films-only person's page collapsed under its
 * skeletons and pulled the footer up, CLS 0.27 on a phone). Unknown
 * (`Unavailable`) keeps every section.
 */
export function hasTvCredits(shows: PersonShows | null | Unavailable): boolean {
  if (shows === null) {
    return false;
  }
  if (isUnavailable(shows)) {
    return true;
  }
  return shows.shows.length + shows.upcoming.length + shows.self.length > 0;
}
