// @vitest-environment jsdom
import { act, fireEvent, render } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import DiaryPoster, { DiaryGlow } from './DiaryPoster';

const SRC = 'https://image.tmdb.org/t/p/w300_and_h450_bestv2/abc.jpg';

const poster = (container: HTMLElement) => container.querySelector('img')!;

/** A 2D context that records its draws (jsdom has no canvas) */
function stubCanvas() {
  const drawImage = vi.fn();
  const context = {
    clearRect: vi.fn(),
    drawImage,
    getImageData: () => ({ data: new Uint8ClampedArray(8 * 12 * 4) }),
    putImageData: vi.fn(),
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  );
  return drawImage;
}

/** `decode()` that settles when the test says so */
function stubDecode() {
  const pending: Array<() => void> = [];
  Object.defineProperty(HTMLImageElement.prototype, 'decode', {
    configurable: true,
    value: () =>
      new Promise<void>((resolve) => {
        pending.push(resolve);
      }),
  });
  Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', {
    configurable: true,
    get: () => 182,
  });
  return async () => {
    await act(async () => {
      for (const resolve of pending.splice(0)) {
        resolve();
      }
    });
  };
}

function Lit({ src }: Readonly<{ src: string }>) {
  const glow = useRef<HTMLCanvasElement>(null);
  return (
    <>
      <DiaryPoster glowRef={glow} src={src} />
      <DiaryGlow ref={glow} />
    </>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(HTMLImageElement.prototype, 'decode');
  Reflect.deleteProperty(HTMLImageElement.prototype, 'naturalWidth');
});

describe('DiaryPoster', () => {
  it('loads with CORS under its own cache key, so the glow can read it', () => {
    const { container } = render(<DiaryPoster src={SRC} />);
    expect(poster(container).getAttribute('crossorigin')).toBe('anonymous');
    expect(poster(container).getAttribute('src')).toMatch(/\?cors$/);
  });

  it('loads once more the plain way when the CORS load fails, then stops', () => {
    const { container } = render(<DiaryPoster src={SRC} />);
    fireEvent.error(poster(container));
    expect(poster(container).hasAttribute('crossorigin')).toBe(false);
    expect(poster(container).getAttribute('src')).not.toMatch(/\?cors/);
    expect(poster(container).getAttribute('srcset')).not.toMatch(/\?cors/);
    // a poster that is really missing: no third try
    const src = poster(container).getAttribute('src');
    fireEvent.error(poster(container));
    expect(poster(container).getAttribute('src')).toBe(src);
  });
});

describe('DiaryGlow', () => {
  // WebKit fires `load` before the bitmap can be drawn: a draw in the event
  // left the canvas blank for rows that loaded after the page
  it('paints once the loaded poster has decoded, not in its load event', async () => {
    const drawImage = stubCanvas();
    const decoded = stubDecode();
    const { container } = render(<Lit src={SRC} />);
    fireEvent.load(poster(container));
    expect(drawImage).not.toHaveBeenCalled();
    await decoded();
    expect(drawImage).toHaveBeenCalledTimes(1);
    expect(drawImage.mock.calls[0]?.[0]).toBe(poster(container));
  });

  it('paints again from the plain poster when the CORS load fails', async () => {
    const drawImage = stubCanvas();
    const decoded = stubDecode();
    const { container } = render(<Lit src={SRC} />);
    fireEvent.error(poster(container));
    fireEvent.load(poster(container));
    await decoded();
    expect(drawImage).toHaveBeenCalledTimes(1);
  });

  it('repaints when the row gets another poster', async () => {
    const drawImage = stubCanvas();
    const decoded = stubDecode();
    const { container, rerender } = render(<Lit src={SRC} />);
    fireEvent.load(poster(container));
    await decoded();
    rerender(<Lit src={SRC.replace('abc', 'def')} />);
    fireEvent.load(poster(container));
    await decoded();
    expect(drawImage).toHaveBeenCalledTimes(2);
  });
});
