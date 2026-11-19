// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import LevelMeter from './LevelMeter';

afterEach(cleanup);

const meter = (container: HTMLElement) => {
  const box = container.firstElementChild as HTMLElement;
  const steps = [...box.children];
  return {
    box,
    lit: steps.filter((step) => step.hasAttribute('data-lit')).length,
    steps: steps.length,
  };
};

describe('LevelMeter', () => {
  it.each([
    ['super', 6],
    ['very-high', 5],
    ['low', 2],
    ['very-low', 1],
  ] as const)('%s lights %i of six steps', (level, lit) => {
    const { container } = render(<LevelMeter level={level} size="row" />);
    expect(meter(container)).toMatchObject({ lit, steps: 6 });
  });

  it('lights none without a level, at the same size', () => {
    const { container } = render(<LevelMeter level={null} size="card" />);
    expect(meter(container)).toMatchObject({ lit: 0, steps: 6 });
  });

  it('is hidden from assistive tech: the level word beside it says it', () => {
    const { container } = render(<LevelMeter level="high" size="chip" />);
    expect(meter(container).box.getAttribute('aria-hidden')).toBe('true');
  });
});
