type WatchRequest = Readonly<{
  watched: boolean;
  seasonNumber?: number;
  episodeNumber?: number;
}>;

/**
 * Marks or unmarks a series, season or episode as watched via the shared
 * route handler. Marking responds with the stored WatchedItem[].
 */
export default function requestWatch(tvSeriesId: number, body: WatchRequest) {
  return fetch(`/api/watch/tv/${tvSeriesId}`, {
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });
}
