import { createStore } from 'zustand';

export type HeaderMode = 'static' | 'floating' | 'hidden';

export type HeaderState = {
  menuBackgroundColor: string;
  menuOpen: boolean;
  mode: HeaderMode;
};

export type HeaderActions = {
  closeMenu: () => void;
  openMenu: (backgroundColor: string) => void;
  setMode: (mode: HeaderMode) => void;
  toggleMenu: (backgroundColor: string) => void;
};

export type HeaderStore = HeaderState & HeaderActions;

const defaultInitState: HeaderState = {
  menuBackgroundColor: '#000',
  menuOpen: false,
  mode: 'static',
};

export const createHeaderStore = (
  initState: HeaderState = defaultInitState,
) => {
  return createStore<HeaderStore>((set, get) => ({
    ...initState,
    closeMenu: () => set({ menuOpen: false }),
    openMenu: (menuBackgroundColor: string) =>
      set({ menuBackgroundColor, menuOpen: true }),
    setMode: (mode: HeaderMode) => set({ mode }),
    toggleMenu: (menuBackgroundColor: string) => {
      const { menuOpen } = get();
      if (!menuOpen) {
        set({ menuBackgroundColor, menuOpen: true });
      } else {
        set({ menuOpen: false });
      }
    },
  }));
};
