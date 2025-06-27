import { createStore, type StateCreator } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

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

export const createPageStore = (
  initState: PageState = defaultInitState,
  name: string,
  persistent = true,
) => {
  const storeCreator: StateCreator<PageStore> = (set) => ({
    ...initState,
    setBackground: (payload) => set((state) => ({ ...state, ...payload })),
  });

  if (!persistent) {
    return createStore(storeCreator) as typeof persistedStore;
  }

  const persistedStore = createStore(
    persist<PageStore>(storeCreator, {
      name,
      onRehydrateStorage: () => {
        return () => {
          sessionStorage.removeItem(name);
        };
      },
      storage: createJSONStorage(() => sessionStorage),
    }),
  );

  return persistedStore;
};
