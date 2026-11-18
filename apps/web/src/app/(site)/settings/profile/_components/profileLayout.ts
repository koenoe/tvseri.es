/**
 * The Profile editor's layout, shared by the editor and its placeholder
 * (`ProfileSkeleton`). The preview comes first in the document, as it shows
 * first below lg: a slow device paints what it has parsed, and with the form
 * first in the HTML (the preview moved up by `order`) it painted the form at
 * the top, then pushed it 307px down when the preview arrived (CLS 0.23 at
 * 800px). From lg each cell has its own column, wherever it is in the HTML.
 */

/** The editor's grid: one column, from lg the form and the 348px preview */
export const EDITOR_GRID =
  'grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_348px]';

/** The preview and its caption: first, and from lg the right-hand column */
export const PREVIEW_CELL = 'flex flex-col gap-3 lg:col-start-2 lg:row-start-1';

/** The form card: from lg the left-hand column */
export const FORM_CARD =
  'flex flex-col gap-4 rounded-16 bg-white/4 p-6 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)] md:gap-6 lg:col-start-1 lg:row-start-1';
