// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import Lane from './Lane';

afterEach(cleanup);

describe('a profile lane’s count pill', () => {
  it('rolls its digits when marks move it, reading the settled number to screen readers', () => {
    const { container } = render(
      <Lane count={1234} dot="cyan" id="catching-up" title="Catching up">
        <p>rows</p>
      </Lane>,
    );
    const said = container.querySelector('.sr-only');
    expect(said?.textContent).toBe('1,234');
    const drawn = container.querySelector('[aria-hidden="true"].tabular-nums');
    expect(drawn?.textContent).toBe('1,234');
  });

  it('has no pill at 0', () => {
    const { container } = render(
      <Lane count={0} dot="cyan" id="paused" title="Paused">
        <p>rows</p>
      </Lane>,
    );
    expect(container.querySelector('.sr-only')).toBe(null);
  });
});
