// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import HowItWorksDrawing from './HowItWorksDrawing';

describe('HowItWorksDrawing', () => {
  it('draws twice on one page, each arrowhead its own drawing’s marker', () => {
    const { container } = render(
      <>
        <HowItWorksDrawing />
        <HowItWorksDrawing />
      </>,
    );
    const ids = [...container.querySelectorAll('marker')].map(
      (marker) => marker.id,
    );
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);

    for (const svg of container.querySelectorAll('svg[role="img"]')) {
      const own = new Set(
        [...svg.querySelectorAll('marker')].map((marker) => marker.id),
      );
      const ends = [...svg.querySelectorAll('[marker-end]')].map(
        (line) =>
          /^url\(#(.+)\)$/.exec(line.getAttribute('marker-end') ?? '')?.[1],
      );
      expect(ends.length).toBeGreaterThan(0);
      for (const end of ends) {
        expect(own.has(end ?? '')).toBe(true);
      }
    }
  });
});
