import { describe, expect, it } from 'vitest';

import { initialStage, loaded, settle, showSlide, topLayer } from './stage';

const indexes = (stage: ReturnType<typeof initialStage>) =>
  stage.layers.map((layer) => layer.index);

describe('the spotlight stage', () => {
  it('starts on one slide, already in', () => {
    const stage = initialStage(3);
    expect(topLayer(stage)).toEqual({
      entering: false,
      index: 3,
      key: 0,
      waiting: false,
    });
  });

  it('fades a new slide in on top of the one showing', () => {
    const stage = showSlide(initialStage(0), 1);
    expect(indexes(stage)).toEqual([0, 1]);
    expect(topLayer(stage).entering).toBe(true);
  });

  it('drops the slides under one once it is fully in', () => {
    const stage = showSlide(initialStage(0), 1);
    const done = settle(stage, topLayer(stage).key);
    expect(indexes(done)).toEqual([1]);
    expect(topLayer(done).entering).toBe(false);
  });

  it('keeps an interrupted slide fading in under the newest, then drops it', () => {
    const one = showSlide(initialStage(0), 1);
    const two = showSlide(one, 2);
    expect(indexes(two)).toEqual([0, 1, 2]);
    // slide 1 finishes first: only slide 0 goes, slide 2 still fades over it
    const firstDone = settle(two, one.layers[1]?.key ?? -1);
    expect(indexes(firstDone)).toEqual([1, 2]);
    const allDone = settle(firstDone, topLayer(two).key);
    expect(indexes(allDone)).toEqual([2]);
  });

  it('shows the same slide twice as two layers (back and forth)', () => {
    const back = showSlide(showSlide(initialStage(0), 1), 0);
    expect(indexes(back)).toEqual([0, 1, 0]);
    expect(new Set(back.layers.map((layer) => layer.key)).size).toBe(3);
  });

  it('replaces everything without a fade when restoring', () => {
    const stage = showSlide(showSlide(initialStage(0), 1), 4, {
      instant: true,
    });
    expect(indexes(stage)).toEqual([4]);
    expect(topLayer(stage).entering).toBe(false);
  });

  it('holds a slide whose backdrop is not ready until it loads', () => {
    const stage = showSlide(initialStage(0), 1, { waiting: true });
    expect(topLayer(stage).waiting).toBe(true);
    expect(topLayer(loaded(stage, topLayer(stage).key)).waiting).toBe(false);
  });

  it('ignores unknown or settled keys', () => {
    const stage = initialStage(0);
    expect(settle(stage, 0)).toBe(stage);
    expect(settle(stage, 42)).toBe(stage);
    expect(loaded(stage, 0)).toBe(stage);
  });
});
