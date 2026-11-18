# Dialogs and sheets

Every modal is a native `<dialog>` opened with `showModal()`. That gives the top layer, the focus trap, inert page content and Escape for free.

- `ModalShell.tsx`: the one shell. `Dialog.tsx` (centred, a bottom sheet on phones), `SideSheet.tsx` (right panel, full screen on phones) and `LargeDialog.tsx` (the episode modal) are built on it.
- `useModalDialog.ts`: the one lifecycle. The `<dialog>` exists only while open (or animating out), so opening is mounting. Its ref callback locks the page scroll, calls `showModal()`, tints the edge strips and joins the top-layer stack. The cleanup undoes that in reverse. React bubbles `cancel` and clicks through the component tree, so each dialog handles only its own events; a picker over a sheet would otherwise close both.
- Escape and a click on the dim ask the owner to close (`onOpenChange(false)`). Motion plays the exit before unmount.
- Back closes a side panel that has no URL of its own through a history entry it pushes (`panelHistory.ts`, `useBackCloses.ts`). A close by ✕ goes back over that entry, so none stays behind.
- Phones: bottom sheets swipe down to close on Vaul's numbers (`sheetSwipe.ts`). A dialog is a bottom sheet below `sm`; `sheetBelow="md"` makes one a sheet across the whole phone layout (the show page's cast & crew).

## Focus

Focus returns to what opened the dialog (`keptOpener.ts`). Safari doesn't focus a button on click, so the last clicked control stands in (`lastInvoker.ts`). The ring shows on return only if the dialog was opened from the keyboard (`focusReturn.ts`).

## Scroll lock and the gap

`scrollLock.ts` sets `overflow: hidden` on `<html>` while any dialog or the menu is open. It is counted, so a picker closing over a sheet doesn't unlock the page.

**Why the gap:** Chromium drops the reserved scrollbar gutter under `overflow: hidden`, even with `scrollbar-gutter: stable`. With classic scrollbars (Windows, many Macs) the page, header and toasts jumped about 15px. The lost width comes back as padding on `<html>`, and as `--scroll-lock-gap` for fixed elements such as the header. Overlay scrollbars give a gap of 0.

## Edge tints (Safari)

`EdgeTint.tsx`. Safari 26 on iOS has no `theme-color`. It colours its status bar and the band under its floating toolbar from the fixed element at each screen edge. A modal `<dialog>` is a transparent full-screen box, so the bars stayed the page colour over a white sheet.

- Each dialog has 12px strips at its top and bottom edges, unpainted and inert. They take the panel's colour as it opens (`tintEdges`; the top only for a full-screen panel), and the page colour as it leaves (`untintEdges`), because Safari keeps the last colour.
- `PageEdgeTint` is the page's own top strip, shown only while the header is fixed. The full reason is in its comment and in `components/background/README.md`.
- No automated test can see Safari's bars. Check changes here by hand in Safari on an iPhone and a Mac.

## `overflow: clip`, not `hidden`

On the dialog (`ModalShell`) and the large panel (`LargeDialog`). A `hidden` box is still a scroll container. Chrome scrolls it to show the control `showModal()` focuses while the panel is mid-entry. That cancelled the sheet's slide-in, and made the episode modal jump sideways as its grow-from-tile scale settled. A clipped box can't scroll.

## Instant navigation

Dialogs on a page hidden by Activity come back as they were left: `KeepValuesOnRemount.tsx` stops Motion replaying the entry on Back, and `keptOpener.ts` remembers the original opener across the detach and re-attach.
