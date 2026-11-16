// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  OPEN_SEARCH_EVENT,
  type OpenSearchDetail,
} from '@/lib/search/openSearch';

import FindPeople from './FindPeople';

describe('Find people (V61, the empty circle)', () => {
  const listener = vi.fn((event: CustomEvent<OpenSearchDetail>) => event);

  afterEach(() => {
    window.removeEventListener(OPEN_SEARCH_EVENT, listener);
    listener.mockClear();
  });

  it('opens search ready for a handle, returning focus to the button', () => {
    window.addEventListener(OPEN_SEARCH_EVENT, listener);
    render(<FindPeople />);

    const button = screen.getByRole('button', { name: 'Find people' });
    fireEvent.click(button);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0].detail).toEqual({
      query: '@',
      trigger: button,
    });
  });
});
