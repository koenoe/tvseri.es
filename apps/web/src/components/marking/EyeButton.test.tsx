// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import EyeButton from './EyeButton';

afterEach(cleanup);

const NOOP = () => {};

describe('EyeButton', () => {
  it('a plain press: no pressed state, the label as its tooltip', () => {
    const onPress = vi.fn();
    const onIntent = vi.fn();
    render(
      <EyeButton
        label="Mark Dexter S02E02 as watched"
        onIntent={onIntent}
        onPress={onPress}
      />,
    );
    const eye = screen.getByRole('button', {
      name: 'Mark Dexter S02E02 as watched',
    });
    expect(eye.hasAttribute('aria-pressed')).toBe(false);
    expect(eye.getAttribute('title')).toBe('Mark Dexter S02E02 as watched');
    fireEvent.pointerEnter(eye);
    fireEvent.focus(eye);
    fireEvent.touchStart(eye);
    expect(onIntent).toHaveBeenCalledTimes(2);
    fireEvent.click(eye);
    expect(onPress).toHaveBeenCalledOnce();
  });

  it('a toggle: its state, its own tooltip, ready on touch too', () => {
    const onIntent = vi.fn();
    const onTouchIntent = vi.fn();
    render(
      <EyeButton
        label="Unmark Dexter S02E02"
        onIntent={onIntent}
        onPress={NOOP}
        onTouchIntent={onTouchIntent}
        pressed
        title="Watched"
      />,
    );
    const eye = screen.getByRole('button', { name: 'Unmark Dexter S02E02' });
    expect(eye.getAttribute('aria-pressed')).toBe('true');
    expect(eye.getAttribute('title')).toBe('Watched');
    fireEvent.touchStart(eye);
    expect(onTouchIntent).toHaveBeenCalledOnce();
  });
});
