import type { SeriesImages } from '@tvseri.es/schemas';
import { buildBackdropImageUrl } from '@tvseri.es/utils';

import { getBackgroundImageProps } from '@/components/background/BackgroundImage';
import getMainBackgroundColor from '@/components/background/getMainBackgroundColor';
import preloadImage from '@/components/background/preloadImage';
import type { BackgroundState } from '@/components/background/store';

import { type ServedSeries, waitForColour } from './data';
import { setTitleDraft, type TitleDraft } from './heroDraft';
import { type Selection, TEXT_TITLE, type TitleKey } from './picker';

/**
 * The live page behind the tray: a pick changes the hero's title at once
 * (the hero renders the draft) and the backdrop and page colour as soon as
 * the image is loaded and its colour known. Only the latest pick lands.
 */

export type AdminSeries = ServedSeries &
  Readonly<{
    backdropImage?: string;
    title: string;
    titleTreatmentImage?: string;
  }>;

export type Preview = (images: SeriesImages, picked: Selection) => void;

export function backdropUrl(
  images: SeriesImages,
  path: string | null,
  series: AdminSeries,
): string | undefined {
  if (!path) {
    return undefined;
  }
  const listed = images.backdrops.find((item) => item.path === path)?.url;
  if (listed) {
    return listed;
  }
  return path === series.backdropPath && series.backdropImage
    ? series.backdropImage
    : buildBackdropImageUrl(path);
}

function toTitleDraft(
  images: SeriesImages,
  title: TitleKey,
): TitleDraft | undefined {
  if (title === TEXT_TITLE) {
    return { kind: 'text' };
  }
  const logo = images.titleTreatment.find((item) => item.path === title);
  return logo
    ? { height: logo.height, kind: 'logo', url: logo.url, width: logo.width }
    : undefined;
}

/** The backdrops around `path` whose colours are worth asking for too. */
export function neighbours(
  images: SeriesImages,
  path: string,
): ReadonlyArray<string> {
  const index = images.backdrops.findIndex((item) => item.path === path);
  return index < 0
    ? []
    : [index + 1, index - 1, index + 2]
        .map((at) => images.backdrops[at]?.path)
        .filter((item): item is string => item !== undefined);
}

let latest = 0;
let lastPickAt = 0;

/** Picks closer together than this (a held arrow key) land once they settle. */
const SETTLE_MS = 160;

const settle = (rapid: boolean) =>
  rapid
    ? new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS))
    : Promise.resolve();

/**
 * A preview bound to the page's background store. Lives as long as the page
 * (the island owns it), so Undo still works after the tray closed.
 */
export function createPreview(
  series: AdminSeries,
  setBackground: (state: BackgroundState) => void,
): Preview {
  return (images, picked) => {
    setTitleDraft(series.id, toTitleDraft(images, picked.title));
    const url = backdropUrl(images, picked.backdrop, series);
    if (!url || !picked.backdrop) {
      return;
    }
    const path = picked.backdrop;
    latest += 1;
    const token = latest;
    const now = performance.now();
    const rapid = now - lastPickAt < SETTLE_MS;
    lastPickAt = now;
    const { src, ...responsive } = getBackgroundImageProps(url);
    const show = async () => {
      // The backdrop crossfades over the whole page: while picks come in
      // quick succession, only the one they settle on is loaded and shown.
      await settle(rapid);
      if (token !== latest) {
        return;
      }
      const [colour] = await Promise.all([
        waitForColour(series.id, path, neighbours(images, path)),
        preloadImage(src, responsive).catch(() => undefined),
      ]);
      if (token !== latest) {
        return;
      }
      setBackground({
        backgroundColor: colour ?? getMainBackgroundColor(),
        backgroundImage: url,
      });
    };
    show();
  };
}
