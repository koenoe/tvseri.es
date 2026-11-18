import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

/**
 * The title the hero shows while an admin picks: the hero renders
 * this draft from state instead of its served title treatment, so the live
 * page shows the picked logo (or the text title) exactly. After a save the
 * draft stays until the page serves the same title, so a stale CDN answer
 * never flips the hero back.
 */
export type TitleDraft =
  | Readonly<{ height: number; kind: 'logo'; url: string; width: number }>
  | Readonly<{ kind: 'text' }>;

const draftStore = createStore<Readonly<Record<number, TitleDraft>>>(
  () => ({}),
);

export function setTitleDraft(
  seriesId: number,
  draft: TitleDraft | undefined,
): void {
  draftStore.setState((state) => {
    const { [seriesId]: _previous, ...rest } = state;
    return draft ? { ...rest, [seriesId]: draft } : rest;
  }, true);
}

const sameTitle = (
  draft: TitleDraft,
  servedTitleTreatment: string | undefined,
) =>
  draft.kind === 'text'
    ? !servedTitleTreatment
    : draft.url === servedTitleTreatment;

/**
 * For the hero's title: the draft, or undefined when the hero should render
 * what it serves (no draft, or the served title already is the draft).
 *
 * @example
 * const draft = useHeroTitleDraft(series.id, series.titleTreatmentImage);
 * if (draft?.kind === 'text') return <h1 className="font-display text-display">{series.title}</h1>;
 * const logo = draft ? draft.url : series.titleTreatmentImage;
 */
export function useHeroTitleDraft(
  seriesId: number,
  servedTitleTreatment: string | undefined,
): TitleDraft | undefined {
  const draft = useStore(draftStore, (state) => state[seriesId]);
  return draft && !sameTitle(draft, servedTitleTreatment) ? draft : undefined;
}
