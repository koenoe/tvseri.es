import { createStore } from 'zustand';

import {
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_BACKGROUND_IMAGE,
} from '@/constants';

export type BackgroundState = Readonly<{
  backgroundColor: string;
  backgroundImage: string;
}>;

type BackgroundActions = Readonly<{
  setBackground: (state: BackgroundState) => void;
}>;

export type BackgroundStore = BackgroundState & BackgroundActions;

const defaultState: BackgroundState = {
  backgroundColor: DEFAULT_BACKGROUND_COLOR,
  backgroundImage: DEFAULT_BACKGROUND_IMAGE,
};

export function createBackgroundStore(
  initialState: BackgroundState = defaultState,
) {
  return createStore<BackgroundStore>((set) => ({
    ...initialState,
    setBackground: (state) => set(state),
  }));
}
