/**
 * A user's Stats page: `/u/{username}/stats/{year}`, the username encoded.
 * The one builder for this URL (sidebar, pills, share, empty year, the
 * profile's links to it).
 */
export default function statsPath(username: string, year: number): string {
  return `/u/${encodeURIComponent(username)}/stats/${year}`;
}
