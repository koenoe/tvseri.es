import { createStore } from 'zustand';

import { DEFAULT_PAGE_COLOR, toPageColor } from './pageColor';

/** A 1×1 transparent GIF: "no backdrop" without a broken image. */
export const DEFAULT_BACKGROUND_IMAGE =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

export type BackgroundState = Readonly<{
  backgroundColor: string;
  backgroundImage: string;
}>;

type BackgroundActions = Readonly<{
  /** The colour is validated: anything but a six-digit hex becomes the ground. */
  setBackground: (state: BackgroundState) => void;
}>;

export type BackgroundStore = BackgroundState & BackgroundActions;

const toSafeState = (state: BackgroundState): BackgroundState => ({
  backgroundColor: toPageColor(state.backgroundColor),
  backgroundImage: state.backgroundImage,
});

export function createBackgroundStore(
  initialState: BackgroundState = {
    backgroundColor: DEFAULT_PAGE_COLOR,
    backgroundImage: DEFAULT_BACKGROUND_IMAGE,
  },
) {
  return createStore<BackgroundStore>((set) => ({
    ...toSafeState(initialState),
    setBackground: (state) => set(toSafeState(state)),
  }));
}
