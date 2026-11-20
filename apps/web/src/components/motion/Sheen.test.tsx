// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Sheen, { FINISH_SHEEN } from './Sheen';

// jsdom has no AnimationEvent, so React would listen for the prefixed
// `webkitAnimationEnd`; with it (as in browsers) it listens for
// `animationend`. Before react-dom loads.
vi.hoisted(() => {
  vi.stubGlobal('AnimationEvent', globalThis.AnimationEvent ?? Event);
});

describe('Sheen', () => {
  // A route Next keeps in a hidden <Activity> restarts its CSS animations
  // when Back shows it again: a sheen that stayed would play once more
  it('is gone once it has played', () => {
    const { container } = render(<Sheen timing={FINISH_SHEEN} />);
    const sheen = container.querySelector('i');
    expect(sheen).not.toBeNull();
    fireEvent.animationEnd(sheen as Element);
    expect(container.querySelector('i')).toBeNull();
  });
});
