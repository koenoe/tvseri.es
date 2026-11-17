/** The ground (`--color-ground`): the page colour when a page sets none. */
export const DEFAULT_PAGE_COLOR = '#1c2223';

/**
 * Set on `<html>` once a page's `BackgroundProvider` holds the colour (its
 * layout effect sets the variable inline): from then on the copy of the
 * server colour that `BackgroundStyle` hoists into `<head>` never applies
 * again, and Activity, Back and other pages are the provider's alone.
 */
export const PAGE_COLOUR_LIVE = 'data-page-colour-live';

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/**
 * The only way a colour reaches the page colour system. It ends up inside a
 * server-rendered `<style>` (BackgroundStyle) and in inline styles, so
 * anything that isn't a plain six-digit hex (a name, a `url()`, a `;}` that
 * breaks out of the rule) becomes the ground instead. A valid
 * colour is used as it is: the API serves every page colour readable under
 * white text (its `groundColor` rule: white/60 at 4.5:1), the artwork's and
 * an admin's pick alike, so the web corrects nothing.
 */
export function toPageColor(value: unknown): string {
  return typeof value === 'string' && HEX_COLOR.test(value)
    ? value.toLowerCase()
    : DEFAULT_PAGE_COLOR;
}
