'use client';

import { useLayoutEffect } from 'react';

import useHeaderLook from './useHeaderLook';

/**
 * The site header's look on <html> (`data-header-mode`), in the same commit
 * as the header's own attribute, for the CSS that follows it
 * (`header-floating:`, `header-fixed:` in `globals.css`): an attribute
 * selector on the root, as a `:root:has(header…)` would make every change
 * re-check the whole page. Only the site header writes it; the style guide's frozen
 * headers don't. Absent before hydration, as the static bar is then.
 */
export default function RootHeaderMode() {
  const { visual } = useHeaderLook();
  useLayoutEffect(() => {
    document.documentElement.dataset.headerMode = visual;
  }, [visual]);
  useLayoutEffect(
    () => () => {
      delete document.documentElement.dataset.headerMode;
    },
    [],
  );
  return null;
}
