// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { Activity } from 'react';
import { describe, expect, it } from 'vitest';

import PageKindMarker from './PageKindMarker';

function Frame({ shown }: Readonly<{ shown: 'overview' | 'subpage' }>) {
  return (
    <div data-profile-frame data-testid="frame">
      <aside>
        <Activity mode={shown === 'overview' ? 'visible' : 'hidden'}>
          <PageKindMarker kind="overview" />
        </Activity>
        <Activity mode={shown === 'subpage' ? 'visible' : 'hidden'}>
          <PageKindMarker kind="subpage" />
        </Activity>
      </aside>
    </div>
  );
}

describe('PageKindMarker', () => {
  it('writes the shown page’s kind on the frame; a page Activity keeps hidden never counts', () => {
    const { getByTestId, rerender } = render(<Frame shown="overview" />);
    const frame = getByTestId('frame');
    expect(frame.dataset.profilePage).toBe('overview');

    rerender(<Frame shown="subpage" />);
    expect(frame.dataset.profilePage).toBe('subpage');

    // Back: the overview is shown again
    rerender(<Frame shown="overview" />);
    expect(frame.dataset.profilePage).toBe('overview');
  });
});
