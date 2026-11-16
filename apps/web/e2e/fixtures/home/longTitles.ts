/**
 * Real series with the longest titles a moment draws, for the overflow
 * checks ("Open Avatar: The Last Airbender" ran under Did you
 * know's pager at 800, where "Open Breaking Bad" fitted). From
 * `LONG_TITLES_FROM` on, the feature and the toy of the day carry these
 * titles instead of the sample ones (`/dev/home?day=2027-01-04` and on, in the
 * e2e build; on `next dev`, which asks for today's moments, `POST
 * /__stub/state` `{ "longTitles": true }`).
 */
export const LONG_TITLES_FROM = '2027-01-01';

const LONG_TITLES = [
  'Law & Order: Special Victims Unit',
  'Avatar: The Last Airbender',
  'Marvel’s Agents of S.H.I.E.L.D.',
  'The Marvelous Mrs. Maisel',
  'Star Wars: The Clone Wars',
  'Tom Clancy’s Jack Ryan',
] as const;

/** Every `title` in the body replaced, in turn, by a long real one */
export function withLongTitles<T>(body: T): T {
  let next = 0;
  const visit = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map(visit);
    }
    if (typeof value !== 'object' || value === null) {
      return value;
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => {
        if (key === 'title' && typeof entry === 'string') {
          const title = LONG_TITLES[next % LONG_TITLES.length];
          next += 1;
          return [key, title];
        }
        return [key, visit(entry)];
      }),
    );
  };
  return visit(body) as T;
}
