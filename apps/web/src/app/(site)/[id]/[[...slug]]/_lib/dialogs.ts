'use client';

import type { EpisodeRef } from '@tvseri.es/schemas';
import { create } from 'zustand';

/**
 * The page's two marking dialogs, opened from anywhere (a tile, the season
 * line, the sheet, the modal, the first-tracking prompt) and rendered once by
 * their hosts (`PickerHost`, `UpToHost`, mounted by the page).
 */
export type PickerRequest = Readonly<{
  seriesId: number;
  /** The episodes it dates (one, a season's open ones, or a drag run). */
  refs: ReadonlyArray<EpisodeRef>;
  /**
   * `one`: "When did you watch E05?"; `set`: "When did you watch Season 2?"
   * + "One date for all 10 episodes"; `run`: a chips drag (no Not watched).
   */
  kind: 'one' | 'set' | 'run';
  /** What the toast calls them: "S03E05 Children", "Season 3", "E06–E09". */
  what: string;
}>;

export type UpToRequest = Readonly<{
  seriesId: number;
  /** The preselected last episode, or none ("Pick the last episode you saw"). */
  target: EpisodeRef | null;
  /** Where it opened: under the season line, in the sheet, or from the hero prompt. */
  at: 'row' | 'sheet' | 'hero';
  /** From the row: the season header's viewport position, to sit under it. */
  anchor?: Readonly<{ left: number; top: number }>;
  /** The first-tracking prompt opens it with "I don't remember" chosen. */
  defaultWhen?: 'now' | 'release' | 'unknown';
}>;

type DialogState = Readonly<{
  picker: PickerRequest | null;
  upTo: UpToRequest | null;
}>;

export const useDialogs = create<DialogState>()(() => ({
  picker: null,
  upTo: null,
}));

export const openPicker = (picker: PickerRequest) =>
  useDialogs.setState({ picker, upTo: null });

export const openUpTo = (upTo: UpToRequest) =>
  useDialogs.setState({ picker: null, upTo });

export const closeDialogs = () =>
  useDialogs.setState({ picker: null, upTo: null });
