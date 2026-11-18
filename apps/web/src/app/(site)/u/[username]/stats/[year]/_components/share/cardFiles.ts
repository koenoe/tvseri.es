/**
 * The card images in the browser. The phone sheet fetches the card as it opens
 * (and on every format or theme switch), so Share… can hand the file to
 * `navigator.share` straight from the tap: iOS drops the tap's permission
 * if `share()` waits on a download first.
 */

type Entry = { blob: Blob | null; promise: Promise<Blob | null> };

const files = new Map<string, Entry>();

/** Starts (once) fetching the card at `path` */
export function prefetchCard(path: string): Promise<Blob | null> {
  const known = files.get(path);
  if (known) {
    return known.promise;
  }
  const entry: Entry = { blob: null, promise: Promise.resolve(null) };
  entry.promise = fetch(path)
    .then((response) => (response.ok ? response.blob() : null))
    .then((blob) => {
      entry.blob = blob;
      if (!blob) {
        files.delete(path);
      }
      return blob;
    })
    .catch(() => {
      files.delete(path);
      return null;
    });
  files.set(path, entry);
  return entry.promise;
}

/** The card at `path` if it has arrived */
export const readyCard = (path: string): Blob | null =>
  files.get(path)?.blob ?? null;

/** Saves the card under `fileName` (same origin, so `download` applies) */
export function saveCard(path: string, fileName: string) {
  const link = document.createElement('a');
  link.href = path;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
}

/**
 * The system share sheet: the image and the link where files can be shared,
 * else just the link. False when the browser has no share sheet.
 */
export function shareCard(
  blob: Blob | null,
  fileName: string,
  url: string,
): boolean {
  if (typeof navigator.share !== 'function') {
    return false;
  }
  const file = blob ? new File([blob], fileName, { type: blob.type }) : null;
  const data =
    file && navigator.canShare?.({ files: [file] })
      ? { files: [file], url }
      : { url };
  // Cancelling the sheet rejects: nothing to do
  navigator.share(data).catch(() => undefined);
  return true;
}
