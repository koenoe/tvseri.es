// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useCallback, useRef, useState } from 'react';
import { describe, expect, it } from 'vitest';

import Stepper from './Stepper';
import { useStepFocus } from './useStepFocus';

/** The importer's frame: the stepper over a step whose own button moves on (each step its own, as the importer's swap remounts them) */
function Steps() {
  const [step, setStep] = useState<1 | 2>(1);
  const { onClickCapture, ref } = useStepFocus(step);
  const next = useCallback(() => setStep(2), []);
  const back = useCallback(() => setStep(1), []);
  return (
    <div onClickCapture={onClickCapture} ref={ref}>
      <button type="button">Outside</button>
      <Stepper step={step} />
      {step === 1 ? (
        <button key="import" onClick={next} type="button">
          Import
        </button>
      ) : (
        <button key="another" onClick={back} type="button">
          Another file
        </button>
      )}
    </div>
  );
}

/** Like the drop zone: its press clicks a file input, then the step moves on */
function FilePick() {
  const [step, setStep] = useState<1 | 2>(1);
  const { onClickCapture, ref } = useStepFocus(step);
  const input = useRef<HTMLInputElement>(null);
  const choose = useCallback(() => {
    input.current?.click();
    setStep(2);
  }, []);
  return (
    <div onClickCapture={onClickCapture} ref={ref}>
      <Stepper step={step} />
      {step === 1 ? (
        <button key="choose" onClick={choose} type="button">
          Choose a file
        </button>
      ) : null}
      <input aria-hidden="true" ref={input} tabIndex={-1} type="file" />
    </div>
  );
}

/** The stepper's current step (the wide one: jsdom draws both) */
const currentStep = () =>
  document.querySelector('[aria-current="step"]') as HTMLElement;

describe('useStepFocus', () => {
  it('takes no focus on the first render', () => {
    render(<Steps />);
    expect(document.activeElement).toBe(document.body);
  });

  it('hands focus from the press that left with its step to the step now on', async () => {
    const user = userEvent.setup();
    render(<Steps />);
    await user.click(screen.getByRole('button', { name: 'Import' }));
    expect(document.activeElement).toBe(currentStep());
    expect(currentStep().textContent).toContain('Check');
    await user.click(screen.getByRole('button', { name: 'Another file' }));
    expect(document.activeElement).toBe(currentStep());
    expect(currentStep().textContent).toContain('Upload');
  });

  it('shows no ring after a pointer press, the ring after a key press', async () => {
    const user = userEvent.setup();
    render(<Steps />);
    await user.click(screen.getByRole('button', { name: 'Import' }));
    expect(currentStep().hasAttribute('data-quiet-focus')).toBe(true);

    screen.getByRole('button', { name: 'Another file' }).focus();
    await user.keyboard('{Enter}');
    expect(document.activeElement).toBe(currentStep());
    expect(currentStep().hasAttribute('data-quiet-focus')).toBe(false);
  });

  // The drop zone opens the file picker by clicking its hidden input
  it('keeps the ring for a key press that clicks a file input on', async () => {
    const user = userEvent.setup();
    render(<FilePick />);
    screen.getByRole('button', { name: 'Choose a file' }).focus();
    await user.keyboard('{Enter}');
    expect(document.activeElement).toBe(currentStep());
    expect(currentStep().hasAttribute('data-quiet-focus')).toBe(false);
  });

  it('leaves focus that is elsewhere alone', () => {
    render(<Steps />);
    const outside = screen.getByRole('button', { name: 'Outside' });
    outside.focus();
    // the step moves on while focus is elsewhere (a dropped file's read)
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));
    expect(document.activeElement).toBe(outside);
  });
});
