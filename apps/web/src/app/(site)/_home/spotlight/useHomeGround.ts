'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';

import { useBackground } from '@/components/background/BackgroundProvider';

import { HOME_GROUND } from './ground';

/**
 * Sets the ground's colour without its 600ms transition: the colour is
 * computed once with the transition off, then the transition is back for
 * the next switch.
 */
function setGroundAtOnce(root: HTMLElement, color: string) {
  const grounds = document.querySelectorAll<HTMLElement>('[data-home-ground]');
  for (const ground of grounds) {
    ground.style.transition = 'none';
  }
  root.style.setProperty(HOME_GROUND, color);
  for (const ground of grounds) {
    void getComputedStyle(ground).backgroundColor;
    ground.style.removeProperty('transition');
  }
}

/**
 * Keeps the page colour on the spotlight's slide. Home's ground reads
 * `--home-ground` (the first slide's colour comes in a <style> with the
 * streamed spotlight, so it paints before any JS); here it follows every
 * slide (before paint), and the page colour store follows too, for the
 * header, menus, footer and Back restore. The store is set in a passive
 * effect so the background provider's own first-mount sync can't undo it.
 *
 * Only a switch fades the ground. The first colour after the page is shown
 * (a mount, Back to a page kept alive, a page rebuilt on Back) and a slide
 * restored on Back (`instant`) are drawn at once: while the page was hidden
 * the variable was removed, so the ground last had the first slide's colour
 * and would otherwise fade from it.
 */
export default function useHomeGround(
  color: string | undefined,
  instant: boolean,
) {
  const setBackground = useBackground((state) => state.setBackground);
  const backgroundImage = useBackground((state) => state.backgroundImage);
  // set once the colour has been drawn since the page was (re)shown
  const shownRef = useRef(false);

  useLayoutEffect(
    () => () => {
      shownRef.current = false;
    },
    [],
  );

  useLayoutEffect(() => {
    if (!color) {
      return;
    }
    const root = document.documentElement;
    if (instant || !shownRef.current) {
      setGroundAtOnce(root, color);
    } else {
      root.style.setProperty(HOME_GROUND, color);
    }
    shownRef.current = true;
    return () => {
      root.style.removeProperty(HOME_GROUND);
    };
  }, [color, instant]);

  useEffect(() => {
    if (color) {
      // home has no Page backdrop: keep the store's
      setBackground({ backgroundColor: color, backgroundImage });
    }
  }, [backgroundImage, color, setBackground]);
}
