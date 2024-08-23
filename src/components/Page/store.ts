import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_BACKGROUND_IMAGE,
} from '@/constants';
import getHistoryKey from '@/utils/getHistoryKey';

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
  const name = `page:${getHistoryKey()}`;

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
        // onRehydrateStorage: () => {
        //   return () => {
        //     sessionStorage.removeItem(name);
        //   };
        // },
      },
    ),
  );
};
