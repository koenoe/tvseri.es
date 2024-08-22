import { createStore } from 'zustand/vanilla';

import {
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_BACKGROUND_IMAGE,
} from '@/constants';

export type PageState = {
  backgroundColor: string;
  backgroundImage: string;
};

export type PageActions = {
  setBackground: (
    payload: Pick<PageState, 'backgroundColor' | 'backgroundImage'>,
  ) => void;
};

export type PageStore = PageState & PageActions;

export const defaultInitState: PageState = {
  backgroundColor: DEFAULT_BACKGROUND_COLOR,
  backgroundImage: DEFAULT_BACKGROUND_IMAGE,
};

export const createPageStore = (initState: PageState = defaultInitState) => {
  return createStore<PageStore>()((set) => ({
    ...initState,
    setBackground: (payload) => set((state) => ({ ...state, ...payload })),
  }));
};
