import { createStore } from 'zustand/vanilla';

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
  backgroundColor: '#000',
  backgroundImage:
    'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
};

export const createPageStore = (initState: PageState = defaultInitState) => {
  return createStore<PageStore>()((set) => ({
    ...initState,
    setBackground: (payload) => set((state) => ({ ...state, ...payload })),
  }));
};
