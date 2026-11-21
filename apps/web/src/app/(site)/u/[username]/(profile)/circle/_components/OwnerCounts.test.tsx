// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { spokenLine } from '@/test/spoken';

import { recordFollow } from '../../_components/shell/followCount';
import OwnerCounts from './OwnerCounts';

afterEach(cleanup);

describe('the Circle header count', () => {
  it('counts a Follow back at once, and the server’s count once it moves', () => {
    const { rerender } = render(<OwnerCounts followers={6} following={8} />);
    expect(
      screen.getByText(spokenLine('8 following · 6 followers')),
    ).toBeTruthy();

    act(() => recordFollow('u-wren', 1));
    expect(
      screen.getByText(spokenLine('9 following · 6 followers')),
    ).toBeTruthy();

    // the refresh came back with the old counter: still counted once
    rerender(<OwnerCounts followers={6} following={8} />);
    expect(
      screen.getByText(spokenLine('9 following · 6 followers')),
    ).toBeTruthy();

    // the server holds it now: not counted twice
    rerender(<OwnerCounts followers={6} following={9} />);
    expect(
      screen.getByText(spokenLine('9 following · 6 followers')),
    ).toBeTruthy();
  });
});
