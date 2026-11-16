import type { Page } from '@playwright/test';

/**
 * The left edges a page shares (the page gutter, `--gutter` in globals.css):
 * the header logo, the footer logo, every on-page title (its leading edge:
 * the dot when its heading line opens with one) and the first tile of
 * every row. Titles inside a card (a rounded box with a background,
 * shadow or image) follow that card's padding and are left out, as are
 * titles in a sideways scroller, centred titles and `sr-only` ones.
 */
export type LeftEdges = Readonly<{
  footer: number | null;
  header: number | null;
  /** the first tile of each row, at its resting scroll position */
  rows: ReadonlyArray<Readonly<{ name: string; x: number }>>;
  titles: ReadonlyArray<Readonly<{ text: string; x: number }>>;
}>;

/** Runs in the page (serialised): see `leftEdges` */
const scan = (): LeftEdges => {
  const round = (value: number) => Math.round(value * 10) / 10;
  const visible = (element: Element) => {
    const box = element.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) return false;
    const style = getComputedStyle(element);
    return (
      style.visibility !== 'hidden' &&
      style.position !== 'absolute' &&
      !element.closest('.sr-only')
    );
  };
  const isCard = (element: Element) => {
    const style = getComputedStyle(element);
    if ((Number.parseFloat(style.borderTopLeftRadius) || 0) < 6) return false;
    const match = /rgba?\(([^)]+)\)/.exec(style.backgroundColor);
    const parts = match?.[1]?.split(/[ ,/]+/).filter(Boolean) ?? [];
    const alpha =
      style.backgroundColor === 'transparent'
        ? 0
        : parts.length > 3
          ? Number(parts[3])
          : 1;
    return (
      alpha > 0 ||
      style.backgroundImage !== 'none' ||
      style.boxShadow !== 'none'
    );
  };
  const onPage = (element: Element) => {
    for (
      let node = element.parentElement;
      node && node.tagName !== 'MAIN';
      node = node.parentElement
    ) {
      if (isCard(node)) return false;
      if (getComputedStyle(node).overflowX === 'auto') return false;
    }
    return true;
  };
  const logoX = (root: Element | null) => {
    const logo = [...(root?.querySelectorAll('svg, img') ?? [])].find(
      (element) => element.getBoundingClientRect().width > 0,
    );
    return logo ? round(logo.getBoundingClientRect().left) : null;
  };

  // A heading line that opens with its dot
  // starts at the dot: the dot sits on the edge, the title follows it
  const leadingEdge = (title: Element) => {
    const left = title.getBoundingClientRect().left;
    const dot = title.previousElementSibling;
    if (!dot) return left;
    const box = dot.getBoundingClientRect();
    const isDot =
      box.width > 0 &&
      box.width <= 12 &&
      box.height <= 12 &&
      Number.parseFloat(getComputedStyle(dot).borderTopLeftRadius) >= 4;
    return isDot ? Math.min(left, box.left) : left;
  };
  const titles = [...document.querySelectorAll('main h1, main h2')]
    .filter(
      (title) =>
        visible(title) &&
        onPage(title) &&
        !title.closest('[role="dialog"], dialog') &&
        getComputedStyle(title).textAlign !== 'center',
    )
    .map((title) => ({
      text: (title.textContent ?? '').trim().slice(0, 40),
      x: round(leadingEdge(title)),
    }));
  const rows = [...document.querySelectorAll('main ul[id$="-rail"]')]
    .filter((rail) => visible(rail) && rail.scrollLeft === 0)
    .flatMap((rail) => {
      const first = rail.querySelector(':scope > li');
      return first && visible(first)
        ? [{ name: rail.id, x: round(first.getBoundingClientRect().left) }]
        : [];
    });
  return {
    footer: logoX(document.querySelector('footer')),
    header: logoX(document.querySelector('header a[href="/"]')),
    rows,
    titles,
  };
};

export const leftEdges = (page: Page): Promise<LeftEdges> =>
  page.evaluate(scan);

/**
 * Every edge that is not on one of the allowed lines (±1px): the page
 * gutter and, on pages with a sidebar, the main column's edge.
 */
export function offEdge(
  edges: LeftEdges,
  allowed: ReadonlyArray<number>,
): ReadonlyArray<string> {
  const on = (x: number | null) =>
    x === null || allowed.some((line) => Math.abs(line - x) <= 1);
  return [
    ...(on(edges.header) ? [] : [`header logo at ${edges.header}`]),
    ...(on(edges.footer) ? [] : [`footer logo at ${edges.footer}`]),
    ...edges.titles
      .filter((title) => !on(title.x))
      .map((title) => `title "${title.text}" at ${title.x}`),
    ...edges.rows
      .filter((row) => !on(row.x))
      .map((row) => `row ${row.name} starts at ${row.x}`),
  ];
}
