import { createContext } from 'react';

/**
 * The key of the result whose page opens whole (`createTargetPrefetch`):
 * the marked one, once an arrow rested on it. Read by its option's link
 * (`OptionLink`), so the results don't re-render for it.
 */
export const WholeResult = createContext<string | null>(null);
