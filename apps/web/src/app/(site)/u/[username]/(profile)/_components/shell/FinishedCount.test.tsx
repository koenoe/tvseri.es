// @vitest-environment jsdom
import { act, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import MotionProvider from '@/components/motion/MotionProvider';

import { bumpCounts } from '../../_lib/shelfCounts';
import FinishedCount from './FinishedCount';

const FINISHED = { finished: 1, watching: -1 };

const ring = (container: HTMLElement) =>
  container.querySelector('[data-slot="flash-ring"]');

function setup(username: string) {
  return render(
    <MotionProvider>
      <FinishedCount finished={218} username={username} />
    </MotionProvider>,
  );
}

describe('FinishedCount: a show finished here lands on the count', () => {
  it('has no ring when it arrives, whatever landed before', () => {
    bumpCounts('ari', FINISHED, 'finished');
    const { container } = setup('ari');
    expect(ring(container)).toBeNull();
  });

  it('rings once a mark made here finishes a show, not for a count change alone', () => {
    const { container } = setup('bea');
    act(() => bumpCounts('bea', FINISHED));
    expect(ring(container)).toBeNull();
    act(() => bumpCounts('bea', FINISHED, 'finished'));
    expect(ring(container)).not.toBeNull();
    expect(container.textContent).toContain('220');
  });
});
