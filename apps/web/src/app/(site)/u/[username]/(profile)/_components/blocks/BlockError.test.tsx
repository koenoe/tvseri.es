// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

// `catchError` needs Next's runtime: run the fallback component directly,
// the way Next calls it after a throw
vi.mock('next/error', () => ({
  catchError:
    (
      fallback: (
        props: Record<string, unknown>,
        info: { retry: () => void },
      ) => ReactNode,
    ) =>
    (props: Record<string, unknown>) =>
      fallback(props, { retry: () => {} }),
}));

import BlockError from './BlockError';

describe('BlockError', () => {
  it('lies over the block placeholder, so a failure keeps its size', () => {
    render(
      <BlockError
        fallback={<div data-testid="placeholder" style={{ height: 168 }} />}
        title="This year so far"
      >
        <span />
      </BlockError>,
    );
    const placeholder = screen.getByTestId('placeholder');
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('This year so far didn’t load.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    // the card is absolutely positioned inside the placeholder's wrapper
    expect(alert.parentElement).toBe(placeholder.parentElement);
    expect(alert.className).toContain('absolute');
    expect(alert.className).toContain('inset-0');
  });

  it('draws a one-line block as one line, without the explanation', () => {
    render(
      <BlockError
        fallback={<div style={{ height: 20 }} />}
        look="line"
        title="Counts"
      >
        <span />
      </BlockError>,
    );
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('Counts didn’t load.');
    expect(alert.textContent).not.toContain('The rest of the page is fine.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });
});
