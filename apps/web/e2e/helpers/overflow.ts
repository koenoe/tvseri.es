import type { Page } from '@playwright/test';

/**
 * Text that does not fit, found in the rendered page (any page, any width):
 *
 * - the document scrolls sideways;
 * - visible text runs outside its card (the nearest rounded box with a
 *   background, shadow or image: lanes, rows, tickets, badges, heroes);
 * - text cut by an ancestor's `overflow` with no ellipsis there (a value cut
 *   in half), including a single nowrap line whose `scrollWidth` is larger
 *   than its box without `text-overflow: ellipsis`;
 * - rows of one list (`data-equal-rows` on the list) with different heights;
 * - a control (link, button, field) with something else drawn over it.
 *
 * Text that is clipped away entirely is fine (a fact dropped from a full
 * line, `MetaRow fit="drop"`), as is text inside a scroller (rails), behind
 * an opacity under 0.15 (invisible or a watermark), `visibility: hidden` or
 * `sr-only`, and a line that ends with
 * an ellipsis (`truncate`, `line-clamp`).
 */
export type OverflowProblem = Readonly<{
  kind: 'page-scroll' | 'outside-card' | 'clipped' | 'covered' | 'unequal-rows';
  /** Where: a short selector-like path and the text */
  where: string;
  detail: string;
}>;

/** Runs in the page (serialised): see `findOverflow` */
const scan = (): OverflowProblem[] => {
  const problems: OverflowProblem[] = [];
  const root = document.documentElement;
  if (root.scrollWidth > root.clientWidth + 1) {
    problems.push({
      detail: `${root.scrollWidth}px wide in a ${root.clientWidth}px window`,
      kind: 'page-scroll',
      where: 'document',
    });
  }

  const styleOf = (element: Element) => getComputedStyle(element);
  const alpha = (colour: string) => {
    if (colour === 'transparent') return 0;
    const match = /rgba?\(([^)]+)\)/.exec(colour);
    const parts = match?.[1]?.split(/[ ,/]+/).filter(Boolean) ?? [];
    return parts.length > 3 ? Number(parts[3]) : 1;
  };
  const isCard = (element: Element) => {
    const style = styleOf(element);
    const radius = Number.parseFloat(style.borderTopLeftRadius) || 0;
    if (radius < 6) return false;
    return (
      alpha(style.backgroundColor) > 0 ||
      style.backgroundImage !== 'none' ||
      style.boxShadow !== 'none'
    );
  };
  const describeNode = (element: Element | null) => {
    const parts: string[] = [];
    let node: Element | null = element;
    while (node && parts.length < 4 && node !== document.body) {
      const slot =
        node.getAttribute('data-slot') ?? node.getAttribute('aria-labelledby');
      parts.unshift(
        slot
          ? `${node.tagName.toLowerCase()}[${slot}]`
          : node.tagName.toLowerCase(),
      );
      node = node.parentElement;
    }
    return parts.join(' > ');
  };
  const hidden = (element: Element) => {
    for (
      let node: Element | null = element;
      node && node !== document.documentElement;
      node = node.parentElement
    ) {
      const style = styleOf(node);
      if (
        style.visibility === 'hidden' ||
        // invisible, or a decorative watermark (the show page's episode
        // number bleeds off its tile at 7.5%, typography spec)
        Number(style.opacity) < 0.15 ||
        style.display === 'none' ||
        (style.position === 'absolute' &&
          (style.clip !== 'auto' || style.clipPath !== 'none') &&
          node.getBoundingClientRect().width <= 1) ||
        node.classList.contains('sr-only')
      ) {
        return true;
      }
    }
    return false;
  };
  const ownsEllipsis = (element: Element) => {
    const style = styleOf(element);
    const clamp = style.getPropertyValue('-webkit-line-clamp');
    return (
      style.textOverflow === 'ellipsis' || (clamp !== '' && clamp !== 'none')
    );
  };
  /**
   * A real scroller (a rail): `overflow-x: hidden` alone computes
   * `overflow-y: auto`, so the axis has to have something to scroll
   */
  const scrolls = (element: Element, style: CSSStyleDeclaration) =>
    (/auto|scroll/.test(style.overflowX) &&
      element.scrollWidth > element.clientWidth + 1) ||
    (/auto|scroll/.test(style.overflowY) &&
      element.scrollHeight > element.clientHeight + 1);

  type Box = { bottom: number; left: number; right: number; top: number };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  const reported = new Set<Element>();
  for (let text = walker.nextNode(); text; text = walker.nextNode()) {
    const parent = text.parentElement;
    if (!parent || !text.textContent?.trim()) continue;
    if (parent.closest('script, style, noscript, svg, template')) continue;
    if (reported.has(parent) || hidden(parent)) continue;
    range.selectNodeContents(text);
    for (const rect of range.getClientRects()) {
      if (rect.width < 1 || rect.height < 1) continue;
      // what the overflow of the ancestors leaves visible, and who cuts it
      const visible: Box = {
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        top: rect.top,
      };
      let cutter: Element | null = null;
      let inScroller = false;
      let ellipsis = false;
      for (
        let node: Element | null = parent;
        node && node !== document.documentElement;
        node = node.parentElement
      ) {
        const style = styleOf(node);
        if (style.overflowX === 'visible' && style.overflowY === 'visible') {
          continue;
        }
        if (scrolls(node, style)) {
          inScroller = true;
          break;
        }
        const box = node.getBoundingClientRect();
        const before = { ...visible };
        visible.left = Math.max(visible.left, box.left);
        visible.right = Math.min(visible.right, box.right);
        visible.top = Math.max(visible.top, box.top);
        visible.bottom = Math.min(visible.bottom, box.bottom);
        if (
          !cutter &&
          (visible.left > before.left + 1 ||
            visible.right < before.right - 1 ||
            visible.top > before.top + 3 ||
            visible.bottom < before.bottom - 3)
        ) {
          cutter = node;
          // the element that cuts the text must be the one drawing the ellipsis
          ellipsis = ownsEllipsis(node);
        }
      }
      if (inScroller) break;
      if (
        visible.right - visible.left < 1 ||
        visible.bottom - visible.top < 1
      ) {
        continue; // dropped whole
      }
      const snippet = text.textContent.trim().slice(0, 60);
      if (cutter && !ellipsis) {
        problems.push({
          detail: `cut by ${describeNode(cutter)} without an ellipsis`,
          kind: 'clipped',
          where: `${describeNode(parent)} "${snippet}"`,
        });
        reported.add(parent);
        break;
      }
      let card: Element | null = parent;
      while (card && card !== document.body && !isCard(card)) {
        card = card.parentElement;
      }
      if (card && card !== document.body) {
        const box = card.getBoundingClientRect();
        if (
          visible.left < box.left - 1 ||
          visible.right > box.right + 1 ||
          visible.top < box.top - 2 ||
          visible.bottom > box.bottom + 2
        ) {
          problems.push({
            detail: `runs outside ${describeNode(card)}`,
            kind: 'outside-card',
            where: `${describeNode(parent)} "${snippet}"`,
          });
          reported.add(parent);
          break;
        }
      }
    }
  }

  // icons, images and controls outside their card (a chevron past the lane)
  for (const element of document.body.querySelectorAll(
    'svg, img, button, input, [role="img"]',
  )) {
    if (element.parentElement?.closest('svg') || hidden(element)) continue;
    const rect = element.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) continue;
    // fully clipped away (a dropped fact) or in a scroller: not on screen
    // here. What an ancestor's overflow cuts off isn't on screen either: a
    // picture larger than the box that clips it (an accordion slice's) is
    // measured by the part that shows, as text is.
    let clipped = false;
    const shown = {
      bottom: rect.bottom,
      left: rect.left,
      right: rect.right,
      top: rect.top,
    };
    for (
      let node = element.parentElement;
      node && node !== document.documentElement;
      node = node.parentElement
    ) {
      const style = styleOf(node);
      if (style.overflowX === 'visible' && style.overflowY === 'visible') {
        continue;
      }
      if (scrolls(node, style)) {
        clipped = true;
        break;
      }
      const box = node.getBoundingClientRect();
      if (
        rect.right <= box.left ||
        rect.left >= box.right ||
        rect.bottom <= box.top ||
        rect.top >= box.bottom
      ) {
        clipped = true;
        break;
      }
      shown.left = Math.max(shown.left, box.left);
      shown.right = Math.min(shown.right, box.right);
      shown.top = Math.max(shown.top, box.top);
      shown.bottom = Math.min(shown.bottom, box.bottom);
    }
    if (clipped) continue;
    let card: Element | null = element.parentElement;
    while (card && card !== document.body && !isCard(card)) {
      card = card.parentElement;
    }
    if (!card || card === document.body) continue;
    const box = card.getBoundingClientRect();
    if (
      shown.left < box.left - 1 ||
      shown.right > box.right + 1 ||
      shown.top < box.top - 2 ||
      shown.bottom > box.bottom + 2
    ) {
      problems.push({
        detail: `runs outside ${describeNode(card)}`,
        kind: 'outside-card',
        where: describeNode(element),
      });
    }
  }

  // a single nowrap line cut without an ellipsis
  for (const element of document.body.querySelectorAll('*')) {
    if (reported.has(element) || element.closest('svg')) continue;
    const style = styleOf(element);
    if (
      !/nowrap|pre/.test(style.whiteSpace) ||
      style.overflowX === 'visible' ||
      scrolls(element, style) ||
      style.textOverflow === 'ellipsis' ||
      style.flexWrap === 'wrap'
    ) {
      continue;
    }
    const ownText = [...element.childNodes].some(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
    );
    if (!ownText || hidden(element)) continue;
    if (element.scrollWidth > element.clientWidth + 1) {
      problems.push({
        detail: `scrollWidth ${element.scrollWidth} > ${element.clientWidth}, no ellipsis`,
        kind: 'clipped',
        where: `${describeNode(element)} "${element.textContent?.trim().slice(0, 60)}"`,
      });
    }
  }

  // a control drawn under something else (Did you know's pager
  // over the "Open …" button at 800): each visible control is brought to the
  // middle of the window and hit-tested at five points; whatever is on top
  // there must be the control, inside it, or one of its own ancestors (a
  // control that lets clicks through). Points under the sticky header and
  // controls scrolled out of their rail are skipped.
  /** a fixed layer over the page (a toast, a banner): it floats over everything by design */
  const fixedLayer = (top: Element, control: Element) => {
    for (
      let node: Element | null = top;
      node && node !== document.body;
      node = node.parentElement
    ) {
      if (node.contains(control)) return false;
      if (styleOf(node).position === 'fixed') return true;
    }
    return false;
  };
  // A card-wide link (an empty, absolutely placed link over the card) under
  // the card's own controls (its ⋯, a pill): the controls sit on it by
  // design, and the rest of the card is the link. The episode wall's tiles
  // do the same with a card-wide button (open the episode).
  const CONTROL = 'a[href], button, [role="button"]';
  const cardWide = (control: Element) =>
    control.matches('a[href]') ||
    control.getBoundingClientRect().width >=
      (control.parentElement?.getBoundingClientRect().width ?? 0) - 1;
  const cardControl = (top: Element, control: Element) =>
    control.matches('a[href], button') &&
    !control.textContent?.trim() &&
    styleOf(control).position === 'absolute' &&
    cardWide(control) &&
    (top.closest(CONTROL) !== null || top.querySelector(CONTROL) !== null);
  const startY = window.scrollY;
  // `content-visibility: auto` blocks (History's days, the episode wall)
  // render their contents only on the frame after they scroll in, so a
  // synchronous hit-test right after the scroll lands on the block's old
  // placeholder box: render them all for the check
  for (const element of document.body.querySelectorAll<HTMLElement>('*')) {
    if (styleOf(element).contentVisibility === 'auto') {
      element.style.contentVisibility = 'visible';
    }
  }
  const controls = document.body.querySelectorAll<HTMLElement>(
    'a[href], button, input, select, textarea, [role="button"]',
  );
  for (const control of controls) {
    if (hidden(control) || control.closest('[inert], header')) continue;
    // an inline link that wraps: its box spans lines of other text, so it
    // is hit-tested on its first line
    const boxOf = (element: HTMLElement) =>
      element.getClientRects().length > 1
        ? (element.getClientRects()[0] ?? element.getBoundingClientRect())
        : element.getBoundingClientRect();
    let rect = boxOf(control);
    if (rect.width < 4 || rect.height < 4) continue;
    window.scrollTo({
      behavior: 'instant',
      top: window.scrollY + rect.top + rect.height / 2 - window.innerHeight / 2,
    });
    rect = boxOf(control);
    // the part the overflow of the ancestors leaves on screen
    const box: Box = {
      bottom: Math.min(rect.bottom, window.innerHeight),
      left: Math.max(rect.left, 0),
      right: Math.min(rect.right, document.documentElement.clientWidth),
      top: Math.max(rect.top, 0),
    };
    for (
      let node = control.parentElement;
      node && node !== document.documentElement;
      node = node.parentElement
    ) {
      const style = styleOf(node);
      if (style.overflowX === 'visible' && style.overflowY === 'visible') {
        continue;
      }
      const clip = node.getBoundingClientRect();
      box.left = Math.max(box.left, clip.left);
      box.right = Math.min(box.right, clip.right);
      box.top = Math.max(box.top, clip.top);
      box.bottom = Math.min(box.bottom, clip.bottom);
    }
    if (box.right - box.left < 4 || box.bottom - box.top < 4) continue;
    const inset = (from: number, to: number, share: number) =>
      from + (to - from) * share;
    const points = [
      [0.5, 0.5],
      [0.2, 0.25],
      [0.8, 0.25],
      [0.2, 0.75],
      [0.8, 0.75],
    ].map(([x = 0.5, y = 0.5]) => [
      inset(box.left, box.right, x),
      inset(box.top, box.bottom, y),
    ]);
    for (const [x = 0, y = 0] of points) {
      const top = document.elementFromPoint(x, y);
      if (
        !top ||
        control.contains(top) ||
        top.contains(control) ||
        top.closest('header, nextjs-portal') ||
        fixedLayer(top, control) ||
        cardControl(top, control)
      ) {
        continue;
      }
      problems.push({
        detail: `covered by ${describeNode(top)} at ${Math.round(x)},${Math.round(y)}`,
        kind: 'covered',
        where: `${describeNode(control)} "${control.textContent?.trim().slice(0, 40) ?? ''}"`,
      });
      break;
    }
  }
  window.scrollTo({ behavior: 'instant', top: startY });

  for (const list of document.querySelectorAll('[data-equal-rows]')) {
    if (hidden(list)) continue;
    const heights = [...list.children]
      .map((row) => Math.round(row.getBoundingClientRect().height))
      .filter((height) => height > 0);
    if (heights.length > 1 && Math.max(...heights) - Math.min(...heights) > 1) {
      problems.push({
        detail: `row heights ${heights.join(', ')}`,
        kind: 'unequal-rows',
        where: describeNode(list),
      });
    }
  }
  return problems;
};

/** Every problem on the page as it is now (call after the content arrived) */
export function findOverflow(page: Page): Promise<OverflowProblem[]> {
  return page.evaluate(scan);
}

/** Opens every capped lane ("Show all N"), so the hidden rows are checked too */
export async function openCappedLists(page: Page): Promise<void> {
  const buttons = page.locator('[data-show-all][aria-expanded="false"]');
  const count = await buttons.count();
  for (let index = 0; index < count; index += 1) {
    await buttons.first().click();
  }
}

/** One line per problem, for a readable assertion message */
export const formatProblems = (problems: ReadonlyArray<OverflowProblem>) =>
  problems
    .map((problem) => `${problem.kind}: ${problem.where} (${problem.detail})`)
    .join('\n');
