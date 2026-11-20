/**
 * A choice whose chosen fill is its `::before`, under its words, so the
 * fill glides (`glideFill`) without moving them. The caller paints the
 * fill on its chosen state (`aria-pressed:before:bg-white/15`). Its own
 * module, with no React and no glide code, so server-drawn class lists
 * (every button's styles) don't carry the glide into each page's chunks.
 */
export const FILL_BEFORE =
  'relative isolate before:absolute before:inset-0 before:-z-1 before:rounded-[inherit]';
