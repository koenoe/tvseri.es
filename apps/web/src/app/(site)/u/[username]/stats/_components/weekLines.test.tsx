import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LINE_COLORS, weekLinesLayout, weekLinesSvg } from './weekLines';

describe('weekLinesLayout', () => {
  it('scales to the busiest week, drawn white', () => {
    const lines = weekLinesLayout({ height: 150, values: [8, 20, 13, 0] });
    expect(lines.map((line) => line.height)).toEqual([60, 150, 98, 2]);
    expect(lines.map((line) => line.color)).toEqual([
      LINE_COLORS.week,
      LINE_COLORS.busiest,
      LINE_COLORS.week,
      LINE_COLORS.future,
    ]);
    expect(lines[0]?.at).toBe(0.125);
  });

  it('draws this week cyan and the weeks to come as stubs', () => {
    const lines = weekLinesLayout({
      currentWeek: 1,
      height: 100,
      values: [4, 2, 9, 9],
    });
    expect(lines.map((line) => [line.height, line.color])).toEqual([
      [100, LINE_COLORS.busiest],
      [50, LINE_COLORS.current],
      [2, LINE_COLORS.future],
      [2, LINE_COLORS.future],
    ]);
  });
});

describe('future stubs', () => {
  it('can be taller than an empty past week', () => {
    const lines = weekLinesLayout({
      currentWeek: 1,
      futureStub: 3,
      height: 100,
      values: [0, 2, 0],
    });
    expect(lines.map((line) => line.height)).toEqual([2, 100, 3]);
  });
});

describe('weekLinesSvg', () => {
  it('draws fixed pixels for next/og', () => {
    const markup = renderToStaticMarkup(
      weekLinesSvg({ height: 40, lineWidth: 2, values: [1, 2], width: 100 }),
    );
    expect(markup).toContain('viewBox="0 0 100 40"');
    expect(markup).toContain('x="24" y="20"');
    expect(markup).toContain('x="74" y="0"');
  });

  it('places fluid lines at percentages', () => {
    const markup = renderToStaticMarkup(
      weekLinesSvg({ height: 40, lineWidth: 2, values: [1, 2] }),
    );
    expect(markup).toContain('width="100%"');
    expect(markup).toContain('x="25.000%"');
  });

  it('spaces the slots by the gap, as flex does', () => {
    // width 100, 2 slots, gap 10: slots 45 wide at 0 and 55, centres 22.5 and 77.5
    const markup = renderToStaticMarkup(
      weekLinesSvg({
        gap: 10,
        height: 40,
        lineWidth: 2,
        values: [1, 2],
        width: 100,
      }),
    );
    expect(markup).toContain('x="21.5" y="20"');
    expect(markup).toContain('x="76.5" y="0"');
  });
});
