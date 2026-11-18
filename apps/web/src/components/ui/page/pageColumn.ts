/**
 * The page column content sits in: 1280 wide (`max-w-page`) with the page
 * gutter either side, so 1216px of content at most. A plain string, so
 * server components, client islands and placeholders all share it; add a
 * page's own classes beside it with `cn()`.
 */
export const PAGE_COLUMN = 'mx-auto w-full max-w-page px-gutter';
