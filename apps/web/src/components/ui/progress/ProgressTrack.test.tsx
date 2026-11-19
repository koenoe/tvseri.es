// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ProgressTrack, { SlidingProgressTrack } from './ProgressTrack';

const parts = (container: HTMLElement) =>
  [...(container.firstElementChild?.children ?? [])] as HTMLElement[];

describe('ProgressTrack', () => {
  it('is a labelled picture: aired, the watched width and the tick where airing stops', () => {
    const { container, getByRole } = render(
      <ProgressTrack aired={60} label="3 of 10 watched" watched={30} />,
    );
    expect(getByRole('img', { name: '3 of 10 watched' })).toBeTruthy();
    const [aired, watched, tick] = parts(container);
    expect(aired?.style.width).toBe('60%');
    expect(watched?.style.width).toBe('30%');
    expect(tick?.style.left).toBe('60%');
  });

  it('draws no tick once everything aired, and no aired stretch when it is left out', () => {
    const { container: all } = render(
      <ProgressTrack aired={100} label="x" watched={10} />,
    );
    expect(parts(all)).toHaveLength(2);
    const { container: none } = render(
      <ProgressTrack label="x" watched={10} />,
    );
    expect(parts(none)).toHaveLength(1);
  });
});

describe('SlidingProgressTrack', () => {
  it('is decorative and slides the fill in from the left', () => {
    const { container } = render(
      <SlidingProgressTrack aired={80} slide="ease-out" watched={44.7} />,
    );
    const track = container.firstElementChild as HTMLElement;
    expect(track.getAttribute('aria-hidden')).toBe('true');
    const [, clip] = parts(container);
    const fill = clip?.firstElementChild as HTMLElement;
    expect(fill.style.transform).toBe('translateX(calc(-55.3%))');
    expect(parts(container)).toHaveLength(2);
  });

  it('puts the tick where it is told while the show airs', () => {
    const { container } = render(
      <SlidingProgressTrack aired={80} tick={80} watched={40} />,
    );
    expect(parts(container)[2]?.style.left).toBe('80%');
  });
});
