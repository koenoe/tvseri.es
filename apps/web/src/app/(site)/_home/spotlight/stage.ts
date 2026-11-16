/**
 * The spotlight's stage: the slides on screen, bottom to top. A switch puts
 * the new slide on top, fading in over what shows; the slides under it stay
 * as they are (one still fading in keeps fading in) until the top one is
 * fully in, then they go. So a switch never shows the ground through the
 * artwork, and rapid presses never flash an earlier slide back.
 */
export type StageLayer = Readonly<{
  /** the slide's index in the ten */
  index: number;
  /** fading in (the top layer after a switch) */
  entering: boolean;
  /** a new key per showing, so a slide shown twice is two layers */
  key: number;
  /** its backdrop isn't decoded yet: it waits to fade in until it loads */
  waiting: boolean;
}>;

export type Stage = Readonly<{
  layers: ReadonlyArray<StageLayer>;
  /** the next layer's key */
  next: number;
}>;

export function initialStage(index: number): Stage {
  return {
    layers: [{ entering: false, index, key: 0, waiting: false }],
    next: 1,
  };
}

/** The slide showing: the top layer's */
export function topLayer(stage: Stage): StageLayer {
  const top = stage.layers.at(-1);
  if (!top) {
    throw new Error('A stage always shows a slide');
  }
  return top;
}

/**
 * Shows slide `index`: on top, fading in (`instant`: alone, no fade, for
 * Back restoring the slide before the first paint). `waiting` holds its
 * fade until its backdrop has loaded.
 */
export function showSlide(
  stage: Stage,
  index: number,
  {
    instant = false,
    waiting = false,
  }: Readonly<{ instant?: boolean; waiting?: boolean }> = {},
): Stage {
  if (instant) {
    return {
      layers: [{ entering: false, index, key: stage.next, waiting: false }],
      next: stage.next + 1,
    };
  }
  return {
    layers: [
      ...stage.layers,
      { entering: true, index, key: stage.next, waiting },
    ],
    next: stage.next + 1,
  };
}

/** Layer `key`'s backdrop has loaded (or failed): its fade can start */
export function loaded(stage: Stage, key: number): Stage {
  const layer = stage.layers.find((item) => item.key === key);
  if (!layer?.waiting) {
    return stage;
  }
  return {
    ...stage,
    layers: stage.layers.map((item) =>
      item.key === key ? { ...item, waiting: false } : item,
    ),
  };
}

/** Layer `key` is fully in: everything under it goes */
export function settle(stage: Stage, key: number): Stage {
  const at = stage.layers.findIndex((item) => item.key === key);
  const layer = stage.layers[at];
  if (!layer || (at === 0 && !layer.entering)) {
    return stage;
  }
  return {
    ...stage,
    layers: [{ ...layer, entering: false }, ...stage.layers.slice(at + 1)],
  };
}
