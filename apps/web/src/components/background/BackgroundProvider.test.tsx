// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Activity, useCallback } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { BackgroundProvider, useBackground } from './BackgroundProvider';

type Nav = Window & { __navIsBack?: boolean };

function SlideTo({ color }: Readonly<{ color: string }>) {
  const setBackground = useBackground((state) => state.setBackground);
  const onClick = useCallback(
    () =>
      setBackground({ backgroundColor: color, backgroundImage: 'slide.jpg' }),
    [color, setBackground],
  );
  return (
    <button onClick={onClick} type="button">
      {`slide ${color}`}
    </button>
  );
}

function ShowPage({
  mode,
  slideTo = '#222222',
}: Readonly<{ mode: 'hidden' | 'visible'; slideTo?: string }>) {
  return (
    <Activity mode={mode}>
      <BackgroundProvider initialColor="#111111" initialImage="server.jpg">
        <SlideTo color={slideTo} />
      </BackgroundProvider>
    </Activity>
  );
}

const pageColor = () =>
  document.documentElement.style.getPropertyValue('--main-background-color');

/** What NavigationTracker leaves behind after a navigation. */
function navigate(key: string, { back }: Readonly<{ back: boolean }>) {
  window.history.replaceState({ key }, '');
  (window as Nav).__navIsBack = back;
}

afterEach(() => {
  (window as Nav).__navIsBack = false;
  document.documentElement.removeAttribute('style');
});

describe('BackgroundProvider', () => {
  it('sets the page colour from the server props', () => {
    navigate('k-first', { back: false });
    render(<ShowPage mode="visible" />);
    expect(pageColor()).toBe('#111111');
  });

  it('follows colour changes, such as a carousel slide', () => {
    navigate('k-slide', { back: false });
    render(<ShowPage mode="visible" />);
    fireEvent.click(screen.getByRole('button', { hidden: true }));
    expect(pageColor()).toBe('#222222');
  });

  it('never applies a colour that is not a six-digit hex', () => {
    navigate('k-bad', { back: false });
    render(<ShowPage mode="visible" slideTo="url(x)" />);
    fireEvent.click(screen.getByRole('button', { hidden: true }));
    expect(pageColor()).toBe('#1c2223');
  });

  it('restores the colour an entry was left with on Back', () => {
    navigate('k-show', { back: false });
    const { rerender } = render(<ShowPage mode="visible" />);
    fireEvent.click(screen.getByRole('button', { hidden: true }));

    // Navigate away: Activity hides the page and the next page owns the colour
    navigate('k-next', { back: false });
    act(() => rerender(<ShowPage mode="hidden" />));
    expect(pageColor()).toBe('');

    // Back: the same entry is shown again, as it was left
    navigate('k-show', { back: true });
    act(() => rerender(<ShowPage mode="visible" />));
    expect(pageColor()).toBe('#222222');
  });

  it('starts from the server colour when the page is reached going forward', () => {
    navigate('k-show-2', { back: false });
    const { rerender } = render(<ShowPage mode="visible" />);
    fireEvent.click(screen.getByRole('button', { hidden: true }));

    navigate('k-next-2', { back: false });
    act(() => rerender(<ShowPage mode="hidden" />));

    // A new link to the same page reuses its Activity but is a new entry
    navigate('k-show-3', { back: false });
    act(() => rerender(<ShowPage mode="visible" />));
    expect(pageColor()).toBe('#111111');
  });
});
