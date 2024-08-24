import { create } from 'zustand';
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

// const storage: PersistStorage<PageState> = {
//   getItem: (name) => {},
//   setItem: (name, value) => {},
//   removeItem: (name) => {},
// };

export const createPageStore = (
  initState: PageState = defaultInitState,
  name: string,
) => {
  return create(
    persist<PageStore, [], [], PageState>(
      (set) => {
        return {
          ...initState,
          setBackground: (payload) =>
            set((state) => ({ ...state, ...payload })),
        };
      },
      {
        name,
        storage: createJSONStorage(() => sessionStorage),
        skipHydration: true,
        // Note: Below is not working as expected
        // therefore we have our own implementation in <PageProvider /> ¯\_(ツ)_/¯
        // storage: createJSONStorage(() => sessionStorage),
        // onRehydrateStorage: () => {
        //   return () => {
        //     sessionStorage.removeItem(name);
        //   };
        // },
      },
    ),
  );
};
