// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CardPreview from './CardPreview';

const DARK = '/u/lena/stats/2025/card?format=square';
const COLOUR = '/u/lena/stats/2025/card?format=square&theme=colour';
const SIZE = { height: 540, width: 540 };

function preview(path: string, onRetry = vi.fn()) {
  return (
    <CardPreview
      alt="lena’s 2025"
      format="square"
      ground={null}
      onRetry={onRetry}
      path={path}
      size={SIZE}
    />
  );
}

const frame = (container: HTMLElement) =>
  container.querySelector('[data-share-frame]')!;
const ghost = (container: HTMLElement) =>
  container.querySelector('[data-card-ghost]');
const status = () => screen.getByRole('status');

/** next/image reports the load after `decode()`, a promise later */
async function load() {
  await act(async () => {
    fireEvent.load(screen.getByRole('img'));
  });
}

describe('CardPreview', () => {
  it('shows the card’s ghost and says it’s being made until the image loads', async () => {
    const { container } = render(preview(DARK));
    expect(ghost(container)).not.toBeNull();
    expect(status().textContent).toBe('Making your card…');
    // not drawn until it has loaded, so a half-arrived file never shows
    expect(screen.getByRole('img').classList.contains('opacity-0')).toBe(true);
    // the frame holds the target size while empty: no layout shift
    expect((frame(container) as HTMLElement).style.width).toBe('540px');
    expect((frame(container) as HTMLElement).style.height).toBe('540px');

    await load();

    expect(ghost(container)).toBeNull();
    expect(status().textContent).toBe('');
    expect(screen.getByRole('img').classList.contains('opacity-0')).toBe(false);
  });

  it('waits again for a new card, and shows a card it has seen at once', async () => {
    const { container, rerender } = render(preview(DARK));
    await load();

    rerender(preview(COLOUR));
    expect(ghost(container)).not.toBeNull();
    expect(screen.getByRole('img').getAttribute('src')).toContain(COLOUR);
    await load();
    expect(ghost(container)).toBeNull();

    rerender(preview(DARK));
    expect(ghost(container)).toBeNull();
  });

  it('says the card didn’t load, and Try again stays, busy, while it loads again', async () => {
    const onRetry = vi.fn();
    const { container } = render(preview(DARK, onRetry));
    await act(async () => {
      fireEvent.error(screen.getByRole('img'));
    });

    expect(screen.getByRole('alert').textContent).toContain(
      'Your card didn’t load.',
    );
    expect(screen.queryByRole('img')).toBeNull();
    expect(ghost(container)).toBeNull();

    const button = screen.getByRole('button', { name: 'Try again' });
    button.focus();
    fireEvent.click(button);

    expect(onRetry).toHaveBeenCalledOnce();
    // the card stays with its button, busy, while a fresh <img> loads
    expect(screen.queryByRole('alert')).toBeNull();
    expect(button.isConnected).toBe(true);
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(document.activeElement).toBe(button);
    expect(screen.getByRole('img')).not.toBeNull();

    // failing again keeps focus where it was
    await act(async () => {
      fireEvent.error(screen.getByRole('img'));
    });
    expect(screen.getByRole('alert')).not.toBeNull();
    expect(document.activeElement).toBe(button);
    expect(button.getAttribute('aria-disabled')).toBeNull();

    fireEvent.click(button);
    await load();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(
      screen.queryByRole('button', { name: /Try again|Loading/ }),
    ).toBeNull();
    expect(ghost(container)).toBeNull();
    expect(screen.getByRole('img').classList.contains('opacity-0')).toBe(false);
  });
});
