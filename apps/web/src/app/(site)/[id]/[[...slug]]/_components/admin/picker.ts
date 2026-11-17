import type {
  PreferredImages,
  SeriesBackdropImage,
  SeriesImages,
  SeriesLogoImage,
} from '@tvseri.es/schemas';
import { languageName } from '@tvseri.es/utils';
import { toPageColor } from '@/components/background/pageColor';

/**
 * The admin image picker's rules (the tray): what visitors see now,
 * what each strip offers and marks, the labels, the page colour line and the
 * save payload. Pure: the tray and the Remote key read these.
 */

/** The text title: the show's name in the display type, no logo. */
export const TEXT_TITLE = 'text';

/** A logo path, or the text title. */
export type TitleKey = string;

export type Selection = Readonly<{
  /** A backdrop path; null when the show has none at all. */
  backdrop: string | null;
  title: TitleKey;
}>;

/** What the page serves, from the series object. */
export type Served = Readonly<{ backdropPath?: string | null }>;

/** What visitors see now: the saved pick, else TMDB's automatic pair. */
export function baseSelection(images: SeriesImages, served: Served): Selection {
  const { automatic, preferred } = images;
  const automaticTitle = automatic.titleTreatmentPath ?? TEXT_TITLE;
  if (preferred) {
    return {
      backdrop: preferred.backdropImagePath,
      title:
        preferred.titleTreatment === TEXT_TITLE
          ? TEXT_TITLE
          : (preferred.titleTreatmentImagePath ?? automaticTitle),
    };
  }
  return {
    backdrop: automatic.backdropPath ?? served.backdropPath ?? null,
    title: automaticTitle,
  };
}

/** The saved pick; `title` is null when it follows the automatic logo. */
export function savedSelection(
  images: SeriesImages,
): Readonly<{ backdrop: string; title: TitleKey | null }> | null {
  const { preferred } = images;
  if (!preferred) {
    return null;
  }
  return {
    backdrop: preferred.backdropImagePath,
    title:
      preferred.titleTreatment === TEXT_TITLE
        ? TEXT_TITLE
        : (preferred.titleTreatmentImagePath ?? null),
  };
}

export const isChanged = (base: Selection, picked: Selection): boolean =>
  base.backdrop !== picked.backdrop || base.title !== picked.title;

const withMarks = (label: string, isAuto: boolean, isSaved: boolean) =>
  `${label}${isAuto ? ', automatic' : ''}${isSaved ? ', saved' : ''}`;

export type BackdropChoice = SeriesBackdropImage &
  Readonly<{
    isAuto: boolean;
    isPicked: boolean;
    isSaved: boolean;
    key: string;
    label: string;
  }>;

export function backdropChoices(
  images: SeriesImages,
  picked: Selection,
): ReadonlyArray<BackdropChoice> {
  const saved = savedSelection(images);
  const total = images.backdrops.length;
  return images.backdrops.map((backdrop, index) => {
    const isAuto = backdrop.path === images.automatic.backdropPath;
    const isSaved = saved?.backdrop === backdrop.path;
    return {
      ...backdrop,
      isAuto,
      isPicked: backdrop.path === picked.backdrop,
      isSaved,
      key: backdrop.path,
      label: withMarks(`Backdrop ${index + 1} of ${total}`, isAuto, isSaved),
    };
  });
}

const languageLabel = (language: string | null) =>
  language ? (languageName(language) ?? language) : 'no language';

export type TitleChoice =
  | (Readonly<{ kind: 'logo'; logo: SeriesLogoImage }> & ChoiceMarks)
  | (Readonly<{ kind: 'text' }> & ChoiceMarks);

type ChoiceMarks = Readonly<{
  isAuto: boolean;
  isPicked: boolean;
  isSaved: boolean;
  key: TitleKey;
  label: string;
}>;

/** Every logo in TMDB's vote order, then the text title. */
export function titleChoices(
  images: SeriesImages,
  title: string,
  picked: Selection,
): ReadonlyArray<TitleChoice> {
  const saved = savedSelection(images);
  const autoTitle = images.automatic.titleTreatmentPath ?? TEXT_TITLE;
  const total = images.titleTreatment.length;
  const logos = images.titleTreatment.map((logo, index): TitleChoice => {
    const isAuto = logo.path === autoTitle;
    const isSaved = saved?.title === logo.path;
    return {
      isAuto,
      isPicked: picked.title === logo.path,
      isSaved,
      key: logo.path,
      kind: 'logo',
      label: withMarks(
        `Logo ${index + 1} of ${total}, ${logo.width} by ${logo.height}, ${languageLabel(logo.language)}`,
        isAuto,
        isSaved,
      ),
      logo,
    };
  });
  const textIsAuto = autoTitle === TEXT_TITLE;
  const textIsSaved = saved?.title === TEXT_TITLE;
  return [
    ...logos,
    {
      isAuto: textIsAuto,
      isPicked: picked.title === TEXT_TITLE,
      isSaved: textIsSaved,
      key: TEXT_TITLE,
      kind: 'text',
      label: withMarks(
        `Text title: ${title} set in the display type`,
        textIsAuto,
        textIsSaved,
      ),
    },
  ];
}

/** "13 of 24"; a backdrop that isn't in the list shows the total. */
export function backdropCount(
  images: SeriesImages,
  backdrop: string | null,
): string {
  const total = images.backdrops.length;
  const index = images.backdrops.findIndex((item) => item.path === backdrop);
  return index < 0 ? `${total} on TMDB` : `${index + 1} of ${total}`;
}

export function titleCount(images: SeriesImages, title: TitleKey): string {
  const total = images.titleTreatment.length;
  if (total === 0) {
    return 'No logos on TMDB';
  }
  if (title === TEXT_TITLE) {
    return 'Text title';
  }
  const index = images.titleTreatment.findIndex((logo) => logo.path === title);
  return index < 0 ? `${total} on TMDB` : `${index + 1} of ${total}`;
}

/** The phone sheet's tabs. */
export const tabLabels = (images: SeriesImages) => ({
  backdrop: `Backdrop · ${images.backdrops.length}`,
  title: `Title · ${images.titleTreatment.length || 'text'}`,
});

export type Availability =
  | Readonly<{ canChoose: true }>
  | Readonly<{ canChoose: false; why: string }>;

/**
 * The Remote key opens the tray when there is something to pick: another
 * backdrop, or a logo (with the text title, that's two titles). A save always
 * needs a backdrop, so a show without any has nothing to choose.
 */
export function availability(
  images: SeriesImages,
  served: Served,
): Availability {
  const backdrops = images.backdrops.length;
  const logos = images.titleTreatment.length;
  const hasBackdrop = baseSelection(images, served).backdrop !== null;
  if (hasBackdrop && (backdrops > 1 || logos > 0)) {
    return { canChoose: true };
  }
  const count =
    backdrops === 0
      ? 'No backdrops'
      : `${backdrops} backdrop${backdrops === 1 ? '' : 's'}`;
  return {
    canChoose: false,
    why: `${count}${logos === 0 ? ', no logos' : ''}: nothing to choose`,
  };
}

export type Status = Readonly<{
  kind: 'busy' | 'dirty' | 'idle';
  label: string;
}>;

export function statusOf({
  busy,
  changed,
  hasSaved,
}: Readonly<{ busy: boolean; changed: boolean; hasSaved: boolean }>): Status {
  if (busy) {
    return { kind: 'busy', label: 'Saving…' };
  }
  if (changed) {
    return { kind: 'dirty', label: 'Unsaved' };
  }
  return { kind: 'idle', label: hasSaved ? 'Your pick · saved' : 'Automatic' };
}

export type PageColour = Readonly<{
  after: string;
  caption: 'After saving' | 'Unchanged';
  changed: boolean;
  now: string;
}>;

/**
 * The page colour now and after saving (the picked backdrop's colour), as
 * the page will paint it (`toPageColor`: the API's colour, validated).
 */
export function pageColour(
  rawNow: string,
  rawAfter: string | undefined,
): PageColour {
  const now = toPageColor(rawNow);
  const after = rawAfter === undefined ? undefined : toPageColor(rawAfter);
  const changed =
    after !== undefined && after.toLowerCase() !== now.toLowerCase();
  return {
    after: changed ? after : now,
    caption: changed ? 'After saving' : 'Unchanged',
    changed,
    now,
  };
}

/** The next key in a strip (←/→), clamped at both ends. */
export function step(
  keys: ReadonlyArray<string>,
  current: string | null,
  direction: -1 | 1,
): string | undefined {
  const index = keys.indexOf(current ?? '');
  if (index < 0) {
    return keys[0];
  }
  return keys[Math.max(0, Math.min(keys.length - 1, index + direction))];
}

/** The `PUT /admin/preferred-images` body; null when it can't be saved yet. */
export function toPreferredImages(
  picked: Selection,
  colour: string | undefined,
): PreferredImages | null {
  if (!picked.backdrop || !colour) {
    return null;
  }
  return {
    backdropColor: colour,
    backdropImagePath: picked.backdrop,
    ...(picked.title === TEXT_TITLE
      ? { titleTreatment: TEXT_TITLE }
      : { titleTreatmentImagePath: picked.title }),
  };
}
