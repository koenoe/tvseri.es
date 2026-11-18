import { expect, type Page } from '@playwright/test';

/**
 * The measuring and asserting half of placeholder parity, shared by the two
 * ways a spec gets its shell:
 *
 * - `shellParity.ts` holds the page at its static shell with `instant()`
 *   (what a browser paints before any streamed part arrives, real network
 *   and scripts included).
 * - `placeholders.ts` loads the page with JavaScript off (every fallback on
 *   screen, every resolved part waiting hidden) in a second context, for
 *   pages whose pre-paint script or viewer decides the fallback.
 *
 * Both end here: the same box type, layout-shift observer, comparison,
 * tolerance and table.
 */

export type Box = Readonly<{
  height: number;
  width: number;
  x: number;
  y: number;
}>;

export type Boxes = Readonly<Record<string, Box>>;

export type Parity = Readonly<{
  /** layout-shift score of the load, shifts from the header excluded */
  cls: number;
  /** each counted shift with the elements that moved, for the report */
  shifts: ReadonlyArray<string>;
  /** The document's height before and after the content arrives, where recorded. */
  documentHeight?: Readonly<{ after: number; before: number }>;
  placeholders: Boxes;
  slots: Boxes;
}>;

export const NONE: Box = { height: 0, width: 0, x: 0, y: 0 };

/** The limit the layout-shift score of a load stays under */
export const CLS_LIMIT = 0.01;

/** px a placeholder may differ from its content in x, y, width and height */
export const TOLERANCE = 2;

/** Collects layout shifts that did not follow input, noting each source. */
export const SHIFT_OBSERVER = `
window.__shifts = [];
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.hadRecentInput) continue;
    window.__shifts.push({
      value: entry.value,
      sources: (entry.sources || []).map((source) => {
        const node = source.node;
        const element = node && node.nodeType === 1 ? node : node && node.parentElement;
        return {
          inHeader: Boolean(element && element.closest('header')),
          rect: Math.round(source.previousRect.x) + ',' + Math.round(source.previousRect.y) + ' ' + Math.round(source.previousRect.width) + 'x' + Math.round(source.previousRect.height) + ' -> ' + Math.round(source.currentRect.x) + ',' + Math.round(source.currentRect.y) + ' ' + Math.round(source.currentRect.width) + 'x' + Math.round(source.currentRect.height),
          name: element
            ? (() => {
                const named = element.closest('[data-slot],[data-placeholder]');
                const label = named
                  ? named.getAttribute('data-slot') || named.getAttribute('data-placeholder')
                  : '';
                return (label ? 'in ' + label + ': ' : '') + element.tagName.toLowerCase();
              })()
            : 'unknown',
        };
      }),
    });
  }
}).observe({ type: 'layout-shift', buffered: true });
`;

/**
 * Every named element's box in document coordinates, rounded to 0.01px.
 * Runs in the page (serialised). `attribute` is `data-placeholder` or
 * `data-slot`; a name that occurs again is keyed `name#1`, `name#2`...; an
 * element with no box is `NONE`.
 */
export const readBoxes = (page: Page, attribute: string) =>
  page.evaluate((attr) => {
    const boxes: Record<string, Box> = {};
    const counts: Record<string, number> = {};
    for (const element of document.querySelectorAll(`[${attr}]`)) {
      const name = element.getAttribute(attr) ?? '';
      const count = counts[name] ?? 0;
      counts[name] = count + 1;
      const key = count === 0 ? name : `${name}#${count}`;
      const rect = element.getBoundingClientRect();
      const hidden = element.getClientRects().length === 0;
      boxes[key] = hidden
        ? { height: 0, width: 0, x: 0, y: 0 }
        : {
            height: Math.round(rect.height * 100) / 100,
            width: Math.round(rect.width * 100) / 100,
            x: Math.round((rect.x + window.scrollX) * 100) / 100,
            y: Math.round((rect.y + window.scrollY) * 100) / 100,
          };
    }
    return boxes;
  }, attribute) as Promise<Boxes>;

/** The layout-shift score so far, without the header's shifts (another page's) */
export const readShifts = (page: Page) =>
  page.evaluate(() => {
    const shifts = (
      window as unknown as {
        __shifts?: ReadonlyArray<{
          sources: ReadonlyArray<{
            inHeader: boolean;
            name: string;
            rect: string;
          }>;
          value: number;
        }>;
      }
    ).__shifts;
    const counted = (shifts ?? []).filter((shift) =>
      shift.sources.some(
        // `unknown` is a node outside the document (the Next dev
        // indicator's shadow root in `next dev`).
        (source) => !source.inHeader && source.name !== 'unknown',
      ),
    );
    return {
      cls: counted.reduce((sum, shift) => sum + shift.value, 0),
      shifts: counted.map(
        (shift) =>
          `${shift.value.toFixed(4)} ${shift.sources.map((source) => `${source.name} [${source.rect}]`).join(', ')}`,
      ),
    };
  });

/** The placeholder-vs-slot table, for the console and the report. */
export function parityTable(parity: Parity, label: string): string {
  const names = Object.keys(parity.placeholders);
  const lines = names.map((name) => {
    const a = parity.placeholders[name] ?? NONE;
    const b = parity.slots[name] ?? NONE;
    const delta = `dx ${(b.x - a.x).toFixed(1)} dy ${(b.y - a.y).toFixed(1)} dw ${(b.width - a.width).toFixed(1)} dh ${(b.height - a.height).toFixed(1)}`;
    return `  ${name.padEnd(26)} ${a.width}x${a.height} @${a.x},${a.y}  ->  ${b.width}x${b.height} @${b.x},${b.y}   ${delta}`;
  });
  const document = parity.documentHeight
    ? `, document ${parity.documentHeight.before} -> ${parity.documentHeight.after}`
    : '';
  return [
    `${label}: cls ${parity.cls.toFixed(3)}${document}`,
    ...parity.shifts.map((shift) => `  shift ${shift}`),
    ...lines,
  ].join('\n');
}

/**
 * Asserts every recorded placeholder has a slot of the same box (within
 * `TOLERANCE` px in x, y, width and height) and that the load shifted
 * nothing (under `CLS_LIMIT`, or `maxShift`).
 */
export function expectParity(
  parity: Parity,
  options: Readonly<{
    names?: ReadonlyArray<string>;
    /** Skips the layout-shift score (a known, documented shift of a block not asserted). */
    ignoreShift?: boolean;
    /** The layout-shift limit where a spec has a documented larger one. */
    maxShift?: number;
    /** Compares width and height only (blocks below one that is known to grow). */
    sizeOnly?: boolean;
    /** px a height may differ by (a block whose content length varies). */
    heightTolerance?: number;
  }> = {},
): void {
  const names = options.names ?? Object.keys(parity.placeholders);
  expect(names.length, 'no placeholder was recorded').toBeGreaterThan(0);
  for (const name of names) {
    const placeholder = parity.placeholders[name];
    expect(placeholder, `placeholder ${name} was not on screen`).toBeDefined();
    const slot = parity.slots[name] ?? NONE;
    for (const key of options.sizeOnly
      ? (['width', 'height'] as const)
      : (['x', 'y', 'width', 'height'] as const)) {
      const limit =
        key === 'height' ? (options.heightTolerance ?? TOLERANCE) : TOLERANCE;
      expect(
        Math.abs((slot[key] ?? 0) - (placeholder?.[key] ?? 0)),
        `${name}: ${key} placeholder ${placeholder?.[key]} vs content ${slot[key]}`,
      ).toBeLessThanOrEqual(limit);
    }
  }
  if (!options.ignoreShift) {
    expect(parity.cls, 'layout shift while the content arrived').toBeLessThan(
      options.maxShift ?? CLS_LIMIT,
    );
  }
}
