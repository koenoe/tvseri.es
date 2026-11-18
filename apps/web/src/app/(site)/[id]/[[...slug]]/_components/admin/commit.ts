import type { PreferredImages, SeriesImages } from '@tvseri.es/schemas';

import { showToast } from '@/components/ui/toast/showToast';

import { resetPreferredImages, savePreferredImages } from './actions';
import { TOASTS } from './copy';
import { type ServedSeries, setImages } from './data';
import { baseSelection } from './picker';
import type { Preview } from './preview';

/**
 * Saving for everyone: `preferred` saves a pick, null resets to automatic.
 * On success the show's choices know the new saved pick at once (the page's
 * own data follows from the server), the page shows it, and the dark toast
 * offers Undo, which writes the previous state back. A failure keeps
 * everything as it was and reports `false`, so the caller keeps the pick.
 */

export type CommitContext = Readonly<{
  images: SeriesImages;
  preview: Preview;
  served: ServedSeries;
}>;

const write = (seriesId: number, preferred: PreferredImages | null) =>
  (preferred
    ? savePreferredImages({ preferred, seriesId })
    : resetPreferredImages(seriesId)
  ).then(
    (result) => result.ok,
    () => false,
  );

/** The error toast; Try again runs `retry`. */
export function showErrorToast(retry: () => void): void {
  showToast({
    action: { label: 'Try again', onClick: retry },
    title: TOASTS.error,
    tone: 'error',
  });
}

function settle(context: CommitContext, preferred: PreferredImages | null) {
  const images = { ...context.images, preferred };
  setImages(images, context.served);
  context.preview(images, baseSelection(images, context.served));
  return images;
}

async function undo(
  context: CommitContext,
  previous: PreferredImages | null,
): Promise<void> {
  if (!(await write(context.served.id, previous))) {
    showErrorToast(() => {
      undo(context, previous);
    });
    return;
  }
  settle(context, previous);
  showToast({ title: TOASTS.undone });
}

export async function commit(
  context: CommitContext,
  preferred: PreferredImages | null,
): Promise<boolean> {
  const previous = context.images.preferred;
  if (!(await write(context.served.id, preferred))) {
    return false;
  }
  const images = settle(context, preferred);
  showToast({
    action: {
      label: 'Undo',
      onClick: () => {
        undo({ ...context, images }, previous);
      },
    },
    title: preferred ? TOASTS.saved : TOASTS.reset,
  });
  return true;
}
