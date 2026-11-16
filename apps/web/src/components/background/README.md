# Background system (page colour)

Every page has a page colour (`--main-background-color`, the `page` colour token) and, on some pages, a backdrop. The system paints the colour on the first frame of a hard load, keeps it right across client navigations, restores it on Back (also after a carousel changed it) and works with Activity (Cache Components keeps visited pages mounted but hidden).

## Use it

```tsx
// A page with a colour and a backdrop (server component)
<Page backgroundColor={show.backdropColor} backgroundImage={show.backdropImage} backgroundPriority>
  …
</Page>

// No backdrop, a faint pattern
<Page backgroundContext="dots">…</Page>

// A carousel: preload the next backdrop, then crossfade (client, inside an `animateBackground` Page)
const setBackground = useBackground((state) => state.setBackground);
await preloadImage(src, responsive).catch(() => undefined);
setBackground({ backgroundColor: item.backdropColor, backgroundImage: item.backdropImage });
```

Reading the colour:

- **CSS (preferred):** the `page` token: `bg-page`, `text-page`, `from-page/0`, `bg-page/90`. It reads the variable on `:root`, so it also works in portals and in the top layer (`<dialog>`, popovers): the search overlay, sheets and menus need nothing else.
- **JS, frozen at a moment:** `getMainBackgroundColor()` returns the validated hex right now (the mobile menu captures it when it opens, so a carousel changing slides behind it doesn't recolour it).
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
│       ├── Background
│       │   ├── BackgroundDynamic  AnimatePresence crossfade (animateBackground)
│       │   │   └── BackgroundBase  backdrop + gradient overlays
│       │   └── BackgroundStatic   plain div
│       │       └── BackgroundBase
│       │   (or the dots / grid pattern)
│       └── children
```

## Data flow

**Hard load (refresh, first visit).** The server HTML holds `<style>:root { --main-background-color: #… }</style>` and `main`'s inline colour, so the first frame has the colour. `BackgroundProvider`'s layout effect then sets the variable on `<html>` and subscribes to the store.

**Client navigation forward.** The new page's provider starts from its server props.

**Back.** Activity re-shows the page. Its layout effect (before paint) reads `isBackNavigation()` and `getHistoryKey()` (`@/lib/navigation`, set by `NavigationTracker`) and restores the state the entry was left with from the cache (`cache.ts`), e.g. the carousel's slide colour. A forward navigation to the same page is a new history entry and starts from the server props.

**Activity hide.** The layout effect cleans up: it saves the store state under the entry's history key (captured at setup, because `history.state` already points at the next entry), removes the variable and disables the `<style>` (`media="not all"`). Setup does the reverse in the same effect, so the variable and the `<style>` never disagree.

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
| `pageColor.ts` | Shared | `toPageColor`, `DEFAULT_PAGE_COLOR` (`#1c2223`) |
| `getMainBackgroundColor.ts` | Client | The current colour, validated |
| `hexToRgb.ts`, `preloadImage.ts` | Shared | Helpers |

## Cache lifecycle

```
Open /1396            → provider mounts, store = server props
Carousel slide        → preloadImage, then setBackground (store update)
Open /1399            → Activity hides /1396: cache[key of that entry] = {color, image}
Back                  → Activity re-shows /1396: isBack → restore from cache, before paint
Refresh               → module Map is empty again; the server <style> paints the colour
```
