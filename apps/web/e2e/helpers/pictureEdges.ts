import type { BrowserContext, Locator, Page } from '@playwright/test';
import sharp from 'sharp';

import { clientSize, nextFrames } from './viewport';

/**
 * The light line along a rounded picture card's edge
 * (`src/components/ui/picture/pictureSurface.ts`), measured on the rendered
 * page: every element that clips with rounded corners and holds a picture
 * under something that darkens it is screenshotted, and along its edge
 * (each straight side and each corner's arc) the pixels are compared across
 * the edge. Drawn right, the edge pixels sit between the page outside and
 * the shaded picture inside; a picture showing through its shade makes a
 * 1-2px band lighter than both.
 *
 * The pictures must be bright for the line to show: `routeBrightPictures`
 * answers every picture with a near-white one. Deliberate light rings
 * (`data-hairline` on the element that draws one, itself or with
 * `::before`/`::after`) are turned off while measuring.
 */

/** A near-white 16:9 picture, with a light diagonal gradient */
let brightPicture: Promise<Buffer> | undefined;
const bright = () => {
  brightPicture ??= sharp(
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><defs><linearGradient id="g" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#e2e6e8"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>',
    ),
  )
    .png()
    .toBuffer();
  return brightPicture;
};

/**
 * Pictures that are not art: logos and wordmarks stay as the stub draws
 * them (white on clear), as do flags and icons
 */
const NOT_ART = /\/img\/logo|\/api\/flags\/|favicon|\.ico(\?|$)|icon\.png/;

/** Answers every picture of the context (posters, backdrops, stills, faces) with a bright one */
export async function routeBrightPictures(
  context: BrowserContext,
): Promise<void> {
  const body = await bright();
  await context.route('**/*', (route) => {
    const request = route.request();
    return request.resourceType() === 'image' && !NOT_ART.test(request.url())
      ? route.fulfill({ body, contentType: 'image/png' })
      : route.fallback();
  });
}

// The shared image rim (`image-rim`, `image-outline`) is a deliberate 1px edge, not a gap
const HAIRLINES_OFF =
  '[data-hairline],[data-hairline]::before,[data-hairline]::after,.image-rim::after,.image-outline{box-shadow:none!important;outline:none!important}';

type Sample = Readonly<{
  /** the inward normal */
  nx: number;
  ny: number;
  where: string;
  x: number;
  y: number;
}>;

type Candidate = Readonly<{ id: string; name: string }>;

/** Runs in the page: tags and names the rounded, clipping picture cards with a shade over the picture */
const findCards = (scope: Element | null): Candidate[] => {
  const root = scope ?? document.body;
  const isMedia = (element: Element) =>
    element.tagName === 'IMG' ||
    element.tagName === 'VIDEO' ||
    element.tagName === 'CANVAS';
  const hasPicture = (style: CSSStyleDeclaration) =>
    /url\(/.test(style.backgroundImage);
  const alpha = (colour: string) => {
    if (colour === 'transparent') return 0;
    const parts =
      /rgba?\(([^)]+)\)/
        .exec(colour)?.[1]
        ?.split(/[ ,/]+/)
        .filter(Boolean) ?? [];
    return parts.length > 3 ? Number(parts[3]) : 1;
  };
  const shades = (style: CSSStyleDeclaration) =>
    alpha(style.backgroundColor) > 0 ||
    /gradient\(/.test(style.backgroundImage);
  const holders = new Set<Element>();
  for (const element of root.querySelectorAll('*')) {
    if (isMedia(element) || hasPicture(getComputedStyle(element))) {
      for (
        let node: Element | null = element;
        node && node !== document.body;
        node = node.parentElement
      ) {
        holders.add(node);
      }
    }
  }
  const found: Candidate[] = [];
  const seen = new Map<string, number>();
  for (const element of holders) {
    if (isMedia(element)) continue;
    const style = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    if (box.width < 24 || box.height < 24 || style.visibility === 'hidden') {
      continue;
    }
    const radius = Number.parseFloat(style.borderBottomLeftRadius) || 0;
    const clips =
      style.overflowX !== 'visible' ||
      style.overflowY !== 'visible' ||
      style.clipPath !== 'none';
    if (radius < 4 || !clips) continue;
    // a shade: something painting over at least a third of the card
    const parts = [...element.querySelectorAll('*')];
    if (parts.length > 400) continue;
    const covers = (rect: DOMRect) =>
      Math.max(
        0,
        Math.min(rect.right, box.right) - Math.max(rect.left, box.left),
      ) *
        Math.max(
          0,
          Math.min(rect.bottom, box.bottom) - Math.max(rect.top, box.top),
        ) >=
      (box.width * box.height) / 3;
    const shaded = [element, ...parts].some((part) =>
      [null, '::before', '::after'].some((pseudo) => {
        if (part === element && pseudo === null) return false;
        const partStyle = getComputedStyle(part, pseudo);
        if (pseudo && partStyle.content === 'none') return false;
        return (
          partStyle.display !== 'none' &&
          shades(partStyle) &&
          !hasPicture(partStyle) &&
          covers(part.getBoundingClientRect())
        );
      }),
    );
    if (!shaded) continue;
    const label =
      element.closest('[data-slot]')?.getAttribute('data-slot') ??
      element.closest('section[aria-labelledby]')?.textContent?.slice(0, 40) ??
      element.tagName.toLowerCase();
    const signature = `${String(element.className).slice(0, 120)}|${Math.round(box.width)}x${Math.round(box.height)}`;
    // the same card drawn many times (a row of tiles): two are enough
    const count = seen.get(signature) ?? 0;
    if (count >= 2) continue;
    seen.set(signature, count + 1);
    const id = `card-${found.length}`;
    element.setAttribute('data-picture-edge', id);
    found.push({
      id,
      name: `${label.trim()} · ${element.tagName.toLowerCase()}.${String(element.className).split(' ').slice(0, 6).join('.')}`,
    });
  }
  return found;
};

/** Runs in the page: the card's edge, sampled where it is on screen and on top */
const edgeOf = (id: string) => {
  const element = document.querySelector(`[data-picture-edge="${id}"]`);
  if (!element) return null;
  const style = getComputedStyle(element);
  const box = element.getBoundingClientRect();
  const half = Math.min(box.width, box.height) / 2;
  const [tl, tr, br, bl] = [
    style.borderTopLeftRadius,
    style.borderTopRightRadius,
    style.borderBottomRightRadius,
    style.borderBottomLeftRadius,
  ].map((value) => Math.min(Number.parseFloat(value) || 0, half)) as [
    number,
    number,
    number,
    number,
  ];
  const samples: Sample[] = [];
  const add = (x: number, y: number, nx: number, ny: number, where: string) =>
    samples.push({ nx, ny, where, x, y });
  for (let x = box.left + tl + 2; x < box.right - tr - 2; x += 6) {
    add(x, box.top, 0, 1, 'top');
  }
  for (let x = box.left + bl + 2; x < box.right - br - 2; x += 6) {
    add(x, box.bottom, 0, -1, 'bottom');
  }
  for (let y = box.top + tl + 2; y < box.bottom - bl - 2; y += 6) {
    add(box.left, y, 1, 0, 'left');
  }
  for (let y = box.top + tr + 2; y < box.bottom - br - 2; y += 6) {
    add(box.right, y, -1, 0, 'right');
  }
  const corner = (
    cx: number,
    cy: number,
    r: number,
    sx: number,
    sy: number,
    where: string,
  ) => {
    if (r < 4) return;
    for (let degrees = 10; degrees <= 80; degrees += 10) {
      const dx = Math.cos((degrees * Math.PI) / 180);
      const dy = Math.sin((degrees * Math.PI) / 180);
      add(cx + sx * r * dx, cy + sy * r * dy, -sx * dx, -sy * dy, where);
    }
  };
  corner(box.left + tl, box.top + tl, tl, -1, -1, 'top left');
  corner(box.right - tr, box.top + tr, tr, 1, -1, 'top right');
  corner(box.right - br, box.bottom - br, br, 1, 1, 'bottom right');
  corner(box.left + bl, box.bottom - bl, bl, -1, 1, 'bottom left');
  const onTop = (sample: Sample) => {
    const reach = 7;
    const ends = [
      [sample.x - sample.nx * reach, sample.y - sample.ny * reach],
      [sample.x + sample.nx * reach, sample.y + sample.ny * reach],
    ];
    const room = document.documentElement;
    if (
      ends.some(
        ([x = 0, y = 0]) =>
          x < 0 ||
          y < 0 ||
          x > room.clientWidth - 1 ||
          y > room.clientHeight - 1,
      )
    ) {
      return false;
    }
    const inside = document.elementFromPoint(
      sample.x + sample.nx * 3,
      sample.y + sample.ny * 3,
    );
    const outside = document.elementFromPoint(
      sample.x - sample.nx * 5,
      sample.y - sample.ny * 5,
    );
    return Boolean(
      inside &&
        (element.contains(inside) || inside.contains(element)) &&
        !(outside && element.contains(outside)),
    );
  };
  return {
    box: { height: box.height, width: box.width, x: box.left, y: box.top },
    samples: samples.filter(onTop),
  };
};

export type EdgeProblem = Readonly<{
  card: string;
  /** luminance (0-255) of the page outside, the edge band and the picture inside, at the worst sample */
  outside: number;
  band: number;
  inside: number;
  /** how many of the edge's samples show the band, and where */
  samples: number;
  where: string;
}>;

/** How much lighter than both sides the band must be (a 0-255 luminance step) */
const LIGHTER = 10;

/** Samples along one edge that must show it: one or two are a glyph near the edge */
const MIN_SAMPLES = 4;

const luminance = (r: number, g: number, b: number) =>
  0.2126 * r + 0.7152 * g + 0.0722 * b;

/**
 * Each picture card on the page (within `scope`, when given), brought into
 * view one at a time and measured; the ones with a light band along their
 * edge. Use `routeBrightPictures` before the page loads.
 */
export async function findPictureEdges(
  page: Page,
  scope?: Locator,
): Promise<EdgeProblem[]> {
  await page.addStyleTag({ content: HAIRLINES_OFF });
  // down the page once, so lazy sections and pictures are asked for (each
  // card below waits for its own pictures)
  for (let step = 0; step < 40; step += 1) {
    const bottom = await page.evaluate(() => {
      window.scrollBy(0, innerHeight * 0.8);
      return innerHeight + scrollY >= document.documentElement.scrollHeight - 2;
    });
    // the scroll reaches the observers that start the loads
    await nextFrames(page);
    if (bottom) break;
  }
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  const root = scope ? await scope.elementHandle() : null;
  const cards = await page.evaluate(findCards, root);
  const scale = await page.evaluate(() => devicePixelRatio);
  const problems: EdgeProblem[] = [];
  for (const card of cards) {
    const selector = `[data-picture-edge="${card.id}"]`;
    await page
      .locator(selector)
      .evaluate((element) =>
        element.scrollIntoView({ behavior: 'instant', block: 'center' }),
      );
    await page.waitForFunction(
      (target) =>
        [
          ...(document.querySelector(target)?.querySelectorAll('img') ?? []),
        ].every((image) => image.complete),
      selector,
    );
    // decoded, and past a fade-in (the images' own, a crossfade): every
    // finite animation or transition in the card has finished
    await page.locator(selector).evaluate(async (element) => {
      await Promise.all(
        [...element.querySelectorAll('img')].map((image) =>
          image.decode().catch(() => undefined),
        ),
      );
      // a fade the load starts (an onLoad that sets a class) has begun
      for (let frame = 0; frame < 2; frame += 1) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      await Promise.all(
        element
          .getAnimations({ subtree: true })
          .filter(
            (animation) =>
              Number.isFinite(animation.effect?.getComputedTiming().endTime) &&
              animation.playState !== 'paused',
          )
          .map((animation) => animation.finished.catch(() => undefined)),
      );
    });
    await nextFrames(page);
    const edge = await page.evaluate(edgeOf, card.id);
    if (!edge?.samples.length) continue;
    const viewport = await clientSize(page);
    const x = Math.max(0, Math.floor(edge.box.x - 10));
    const y = Math.max(0, Math.floor(edge.box.y - 10));
    const clip = {
      height:
        Math.min(
          viewport.height,
          Math.ceil(edge.box.y + edge.box.height + 10),
        ) - y,
      width:
        Math.min(viewport.width, Math.ceil(edge.box.x + edge.box.width + 10)) -
        x,
      x,
      y,
    };
    const { data, info } = await sharp(await page.screenshot({ clip }))
      .raw()
      .toBuffer({ resolveWithObject: true });
    const at = (px: number, py: number) => {
      const ix = Math.round((px - x) * scale - 0.5);
      const iy = Math.round((py - y) * scale - 0.5);
      if (ix < 0 || iy < 0 || ix >= info.width || iy >= info.height) {
        return null;
      }
      const offset = (iy * info.width + ix) * info.channels;
      return luminance(
        data[offset] ?? 0,
        data[offset + 1] ?? 0,
        data[offset + 2] ?? 0,
      );
    };
    const median = (values: ReadonlyArray<number | null>) => {
      const sorted = values
        .filter((value): value is number => value !== null)
        .sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length / 2)];
    };
    const lightest = (values: ReadonlyArray<number | null>) => {
      const known = values.filter((value): value is number => value !== null);
      return known.length ? Math.max(...known) : undefined;
    };
    let worst: (EdgeProblem & { excess: number }) | null = null;
    let hits = 0;
    const places = new Set<string>();
    for (const sample of edge.samples) {
      const across = (from: number, to: number) => {
        const values: Array<number | null> = [];
        for (let d = from; d <= to; d += 1 / scale) {
          values.push(at(sample.x + sample.nx * d, sample.y + sample.ny * d));
        }
        return values;
      };
      // the outside's lightest pixel: text or a picture behind the card
      // (a dialog's page) is not the card's edge
      const outside = lightest(across(-6.5, -2.5));
      const inside = median(across(3.5, 6.5));
      const band = lightest(across(-1.5, 1.5));
      if (outside === undefined || inside === undefined || band === undefined) {
        continue;
      }
      const excess = band - Math.max(outside, inside);
      if (excess <= LIGHTER) continue;
      hits += 1;
      places.add(sample.where);
      if (!worst || excess > worst.excess) {
        worst = {
          band: Math.round(band),
          card: card.name,
          excess,
          inside: Math.round(inside),
          outside: Math.round(outside),
          samples: 0,
          where: '',
        };
      }
    }
    if (worst && hits >= MIN_SAMPLES) {
      const { excess: _excess, ...problem } = worst;
      problems.push({
        ...problem,
        samples: hits,
        where: [...places].join(', '),
      });
    }
  }
  return problems;
}

export const formatEdgeProblems = (problems: ReadonlyArray<EdgeProblem>) =>
  problems
    .map(
      (problem) =>
        `${problem.card}: a light band at ${problem.where} (${problem.samples} samples; outside ${problem.outside}, band ${problem.band}, inside ${problem.inside})`,
    )
    .join('\n');
