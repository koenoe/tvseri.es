import { toPageColor } from './pageColor';

/**
 * The page colour right now, read from the CSS variable (client only). For a
 * surface that must keep the colour it opened with (the mobile menu overlay);
 * anything that may follow the page live can use the `page` colour token
 * (`bg-page`, `from-page/0`) instead, which also works in portals and the top
 * layer.
 */
export default function getMainBackgroundColor(): string {
  return toPageColor(
    getComputedStyle(document.documentElement)
      .getPropertyValue('--main-background-color')
      .trim(),
  );
}
