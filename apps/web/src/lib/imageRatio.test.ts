import { describe, expect, it } from 'vitest';

import { imageRatio } from './imageRatio';

const png = (width: number, height: number) => {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  bytes.set([0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52], 8);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
};
const text = (value: string) => new TextEncoder().encode(value);

describe('imageRatio', () => {
  it('reads a PNG’s size from its header', () => {
    expect(imageRatio(png(553, 148))).toBeCloseTo(553 / 148);
  });

  it('reads an SVG’s viewBox, else its width and height', () => {
    expect(
      imageRatio(
        text('<?xml version="1.0"?><svg viewBox="0 0 66 10" fill="#fff">'),
      ),
    ).toBeCloseTo(6.6);
    expect(imageRatio(text('<svg width="120" height="40">'))).toBe(3);
  });

  it('is null for anything else', () => {
    expect(imageRatio(text('GIF89a'))).toBeNull();
    expect(imageRatio(png(0, 10))).toBeNull();
    expect(imageRatio(new Uint8Array())).toBeNull();
  });
});
