// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ChangeEvent, useCallback, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import MotionProvider from '@/components/motion/MotionProvider';
import ProfileForm from './ProfileForm';

const SAVED = 'Koen';

/** The editor around the form: one field's draft against what's saved */
function Editor() {
  const [name, setName] = useState(SAVED);
  const changed = name !== SAVED;
  const onName = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setName(event.target.value),
    [],
  );
  const onCancel = useCallback(() => setName(SAVED), []);
  return (
    <MotionProvider>
      <ProfileForm
        canSave={changed}
        changed={changed}
        email="koen@example.com"
        hint={{ canSave: true, message: 'Your public name', tone: 'neutral' }}
        name={name}
        onCancel={onCancel}
        onName={onName}
        onSubmit={vi.fn()}
        onUsername={vi.fn()}
        saving={false}
        username="koen"
      />
    </MotionProvider>
  );
}

describe('ProfileForm', () => {
  // Cancel leaves with the edit it undid: focus stays in the save bar
  it('hands focus to Save (now “Saved”) once Cancel is pressed', async () => {
    const user = userEvent.setup();
    render(<Editor />);
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 's');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Saved' }),
    );
  });
});
