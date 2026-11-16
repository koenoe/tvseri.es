import { plural } from '@/lib/format/text';

/**
 * The file name in a `Content-Disposition: attachment; filename="…"` header,
 * reduced to plain characters (it names a file on the viewer's disk).
 */
export function attachmentName(
  header: string | null,
  fallback: string,
): string {
  const match = header?.match(/filename="?([^";]+)"?/i);
  const name = match?.[1]?.replace(/[^A-Za-z0-9._-]/g, '');
  return name || fallback;
}

/** Rows in a CSV: its lines minus the header. */
export function csvRowCount(csv: string): number {
  const lines = csv.split('\n').filter((line) => line !== '').length;
  return Math.max(0, lines - 1);
}

/** The toast after a download: "Downloaded tvseries-….csv · 4,812 episodes". */
export const downloadedToast = (name: string, episodes?: number) =>
  episodes === undefined
    ? `Downloaded ${name}`
    : `Downloaded ${name} · ${plural(episodes, 'episode')}`;

/** What a failed download says, by the route handler's status. */
export function downloadErrorText(status: number): string {
  if (status === 413) {
    return 'Your export is too big to download in one go.';
  }
  if (status === 401) {
    return 'Sign in again to download your data.';
  }
  return 'Couldn’t prepare your export. Try again.';
}
