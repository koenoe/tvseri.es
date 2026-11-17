# Site header

## Five looks

`useHeaderLook()` gives what the header draws, written as `data-header-mode`:

| Look | When |
|---|---|
| `static` | The bar at the top of the page, and always within 60px of the top. Also the reset after every navigation. |
| `hidden` | Scrolled away on the first pixel down past 60px. |
| `floating` | The frosted pill, fixed at the top, once you scroll up 8px since the last turn (Headroom's tolerance, so a wobble doesn't flicker it). |
| `menu` | Phone: the menu is open; the bar sits transparent over its glass. |
| `named` | Phone: the page's title has scrolled away, so the bar shows the page name in place of the logo (`useNamedHeader`, `PageName.tsx`). |

The first three are the scroll mode (`headerMode.ts`, a pure `trackScroll`), and the store keeps it (`store.ts`). Keyboard focus moving into a hidden header brings the pill back, so focus never lands on something invisible.

## Why it's built this way

- **One scroll read per frame.** `HeaderScrollTracker.tsx` is a plain listener that reads `scrollY` once per animation frame after a scroll or resize. Motion's `useScroll` would put its scroll-timeline engine in every page's first-load JS. The tracker compares the path on each event instead of reading `usePathname`, so the header stays in the static shell.
- **The look is mirrored on `<html>`.** `RootHeaderMode.tsx` writes `data-header-mode` on the root in the same commit as the header's own attribute. CSS elsewhere follows it through the `header-floating:` and `header-fixed:` variants (`app/globals.css`), for example sticky sidebars moving down under the pill (`belowFloatingHeader.ts`) and the page's Safari edge strip (`components/ui/dialog/EdgeTint.tsx`). An attribute selector on the root is cheap. The earlier `:root:has(header…)` made every mode change re-check the whole page, which caused visible flicker on long pages such as History.
- The attribute is absent before hydration, which matches the static bar the server renders.
- Only changes to or from the pill animate (`previousMode`). A navigation resets to `static` without animating.

If you simplify this: reading scroll on every event, or using `:has()` on the header, brings back scroll jank and the History flicker. Dropping the root attribute leaves the sidebars and the Safari strip out of step with the header.
