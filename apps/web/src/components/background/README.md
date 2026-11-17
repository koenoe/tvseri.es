# Background system (page colour)

Every page has a page colour (`--main-background-color`, the `page` colour token) and, on some pages, a backdrop. The system paints the colour on the first frame of a hard load, keeps it right across client navigations, restores it on Back (also after Home's spotlight changed it) and works with Activity (Cache Components keeps visited pages mounted but hidden).

## Use it

```tsx
// A page with a colour and a backdrop (server component)
<Page backgroundColor={show.backdropColor} backgroundImage={show.backdropImage} backgroundPriority>
  …
</Page>

// The page colour only: no image means no backdrop layer (`backgroundContext` defaults to `none`)
<Page backgroundColor={color}>…</Page>

// Explicitly no backdrop, whatever else is passed (the Discover landings draw their own glow)
<Page backgroundColor={ground} backgroundContext="none">…</Page>

// Crossfade to another backdrop (client, inside an `animateBackground` Page: only the show page,
// whose admin preview swaps the backdrop): preload it, then set it
const setBackground = useBackground((state) => state.setBackground);
await preloadImage(src, responsive).catch(() => undefined);
setBackground({ backgroundColor: colour, backgroundImage: url });
```

`backgroundContext` is `page` (the backdrop and its side, radial and bottom gradients in the page colour) or `none` (the page colour only). It defaults to `page` when the page passes a `backgroundImage` or `animateBackground`, else `none`: gradients in the page colour over the page colour would draw nothing.

Reading the colour:

- **CSS (preferred):** the `page` token: `bg-page`, `text-page`, `from-page/0`, `bg-page/90`. It reads the variable on `:root`, so it also works in portals and in the top layer (`<dialog>`, popovers): the search overlay, sheets and menus need nothing else.
- **JS, the value itself:** `getMainBackgroundColor()` returns the validated hex right now (the show page's admin preview falls back to it).
- **Hero artwork under the header:** `heroShade(color)` returns the vignette and side fade in the hero's colour, for the end of the hero's own background list (the show page's phone backdrop, Home's spotlight artwork).
- **Inside a Page:** `useBackground((state) => state.backgroundColor)`.

The colour must be a six-digit hex (`#1c2223`, any case). Anything else (a name, `url()`, a `;}` that breaks out of the rule) becomes the ground `#1c2223`: `toPageColor()` runs in `Page`, at the `<style>` sink (`BackgroundStyle`) and in the store, so a bad value never reaches the DOM.

A valid colour is used as it is: the API serves every page colour readable under white text (white at 60% at 4.5:1), so the web corrects nothing. The admin tray shows the colour as the page paints it.

## Architecture

```
Page.tsx (server)
├── BackgroundProvider      client: Zustand store, history cache, CSS variable sync
│   ├── BackgroundStyle     server: <style> with the validated colour
│   │   └── BackgroundStyleTag  Activity-proof <style> (media toggle)
│   └── <main>
│       ├── Background          (backgroundContext `page`; none for `none`)
│       │   ├── BackgroundDynamic  AnimatePresence crossfade (animateBackground)
│       │   │   └── BackgroundBase  backdrop + gradient overlays
│       │   └── BackgroundStatic   plain div
│       │       └── BackgroundBase
│       └── children
```

## Data flow

**Hard load (refresh, first visit).** The server HTML holds the colour twice (`BackgroundStyle`): a `<style>` hoisted into `<head>` (React 19 `<style precedence>`), `html:not([data-page-colour-live]) { --main-background-color: #… }`, which applies from the first frame even on a slow device still parsing the body; and the in-page Activity-proof `<style>` (`BackgroundStyleTag`) with the variable and the `body`/`main`/footer colour, beside `main`'s inline colour. `BackgroundProvider`'s layout effect then sets the variable on `<html>`, sets `PAGE_COLOUR_LIVE` (`data-page-colour-live`, `pageColor.ts`) so the head copy never applies again, and subscribes to the store.

**Client navigation forward.** The new page's provider starts from its server props.

**Back.** Activity re-shows the page. Its layout effect (before paint) reads `isBackNavigation()` and `getHistoryKey()` (`@/lib/navigation`, set by `NavigationTracker`) and restores the state the entry was left with from the cache (`cache.ts`), e.g. the spotlight slide's colour. A forward navigation to the same page is a new history entry and starts from the server props.

**Activity hide.** The layout effect cleans up: it saves the store state under the entry's history key (captured at setup, because `history.state` already points at the next entry), removes the variable and disables the `<style>` (`media="not all"`). Setup does the reverse in the same effect, so the variable and the `<style>` never disagree.

**Safari's top bar (macOS tab tint, iOS status bar).** Safari takes the colour from a fixed element at the top edge if there is one, else from the page's background (`body`, which is `bg-page`). The page background follows every change of the variable. A fixed element does not: WebKit stops sampling the top edge after the first real scroll below the top on a Mac or an iPad and keeps the last top element's colour until the next document load (`Page::canSampleTopFixedContainerEdge`). And when the top edge has no fixed element any more, WebKit keeps the last one's colour while that element still renders (the header's glass pill has no single colour, so an iPhone froze on whatever it showed when the pill appeared). So `PageEdgeTint` (`components/ui/dialog/EdgeTint.tsx`, in the root layout), a 12px `bg-page` strip above the header, is shown only while the header is fixed, and is `display: none` (no renderer, WebKit lets go) whenever the header is `static`, which is the top of every page after a navigation: Safari then reads the body. A modal dialog's own strips sit above it in the top layer.

**Re-show without a crossfade.** On a re-show the store sync would crossfade `BackgroundDynamic`; `MotionGlobalConfig.instantAnimations` is set for two frames so it's instant.

## Files

| File | Type | Purpose |
|------|------|---------|
| `Page.tsx` | Server | The public component: provider + style + `<main>` + backdrop |
| `BackgroundProvider.tsx` | Client | Store, cache save/restore, CSS variable sync, `useBackground` |
| `BackgroundStyle.tsx` | Server | The validated `<style>` |
| `BackgroundStyleTag.tsx` | Client | `<style>` with the Activity `media` toggle |
| `Background.tsx` | Server | Picks Dynamic or Static |
| `BackgroundDynamic.tsx` | Client | Crossfade on store change |
| `BackgroundStatic.tsx` | Server | No animation |
| `BackgroundBase.tsx` | Shared | Backdrop + gradients in the layer's own colour |
| `BackgroundImage.tsx` | Server | Responsive `<img>` through the TMDB loader, `preload()` when `priority` |
| `store.ts` | Shared | Zustand store; validates the colour |
| `cache.ts` | Client | `Map<historyKey, state>`; `saveBackground`, `restoreBackground` |
| `pageColor.ts` | Shared | `toPageColor`, `DEFAULT_PAGE_COLOR` (`#1c2223`), `PAGE_COLOUR_LIVE`, `contrast` |
| `getMainBackgroundColor.ts` | Client | The current colour, validated |
| `heroShade.ts` | Shared | The vignette and side fade for hero artwork under the header |
| `hexToRgb.ts`, `preloadImage.ts` | Shared | Helpers |

## Cache lifecycle

```
Open /                → provider mounts, store = server props
Spotlight slide       → setBackground (store update: Home's colour follows the slide)
Open /1396            → Activity hides /: cache[key of that entry] = {color, image}
Back                  → Activity re-shows /: isBack → restore from cache, before paint
Refresh               → module Map is empty again; the server <style> paints the colour
```
