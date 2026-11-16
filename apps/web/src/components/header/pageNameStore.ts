import { create } from 'zustand';

type PageNameState = Readonly<{
  /** The page's name, set by the page itself (`PageName`); null on most pages */
  name: string | null;
  /** The page's title has scrolled up out of sight */
  titleAway: boolean;
  set: (name: string | null, titleAway: boolean) => void;
  setTitleAway: (titleAway: boolean) => void;
}>;

/**
 * The page's name for the phone header (scrolled: the header
 * shrinks to the name once the title scrolls away). The page sits outside the
 * header's own store, so the two meet in this tiny module store: a page sets
 * its name and whether its title is out of sight, the header reads both.
 */
export const usePageNameStore = create<PageNameState>((set) => ({
  name: null,
  set: (name, titleAway) => set({ name, titleAway }),
  setTitleAway: (titleAway) => set({ titleAway }),
  titleAway: false,
}));
