import { createStore } from 'zustand';

import { type HeaderMode, modeOnFocus } from './headerMode';

export type HeaderState = Readonly<{
  menuOpen: boolean;
  mode: HeaderMode;
  /** The mode before the last change: only changes to or from the pill animate. */
  previousMode: HeaderMode;
}>;

type HeaderActions = Readonly<{
  closeMenu: () => void;
  /** Back to the static bar without animating (after a navigation). */
  resetMode: () => void;
  /** Focus moved into the header: the hidden header comes back as the pill. */
  revealOnFocus: () => void;
  setMode: (mode: HeaderMode) => void;
  toggleMenu: () => void;
}>;

export type HeaderStore = HeaderState & HeaderActions;

export const createHeaderStore = (initialMode: HeaderMode = 'static') =>
  createStore<HeaderStore>((set, get) => ({
    closeMenu: () => {
      if (get().menuOpen) {
        set({ menuOpen: false });
      }
    },
    menuOpen: false,
    mode: initialMode,
    previousMode: initialMode,
    resetMode: () => {
      if (get().mode !== 'static' || get().previousMode !== 'static') {
        set({ mode: 'static', previousMode: 'static' });
      }
    },
    revealOnFocus: () => get().setMode(modeOnFocus(get().mode)),
    setMode: (mode) => {
      const current = get().mode;
      if (mode !== current) {
        set({ mode, previousMode: current });
      }
    },
    toggleMenu: () => set({ menuOpen: !get().menuOpen }),
  }));
