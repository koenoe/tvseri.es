// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import PersonChip from './PersonChip';

afterEach(cleanup);

describe('PersonChip', () => {
  it('says the name and the level in its own text, with no label on a plain span', () => {
    const { container } = render(
      <PersonChip
        person={{ id: 'u-juno', level: 'super', username: 'juno' }}
      />,
    );
    const chip = container.firstElementChild as HTMLElement;
    expect(chip.hasAttribute('aria-label')).toBe(false);
    expect(chip.textContent).toBe('juno, Super match');
  });

  it('says only the name without a level', () => {
    const { container } = render(
      <PersonChip person={{ id: 'u-wren', level: null, username: 'wren' }} />,
    );
    expect(container.textContent).toBe('wren');
  });
});
