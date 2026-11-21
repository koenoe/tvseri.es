// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { GLIDE } from '@/components/motion/glide';

import FactDeck from './FactDeck';
import { PIP_FILL } from './layout';

afterEach(cleanup);

const SENTENCES = ['One', 'Two', 'Three'];
const SLIDES = SENTENCES.map((text) => <p key={text}>{text}</p>);

const fill = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-pip-fill]');

const another = () => fireEvent.click(screen.getByRole('button'));

describe('Did you know’s pips', () => {
  it('fill the first pip before anything is pressed', () => {
    const { container } = render(
      <FactDeck sentences={SENTENCES} slides={SLIDES} />,
    );
    expect(fill(container)?.style.translate).toBe('0rem');
  });

  it('“Another” moves the fill to the next pip, and from the last back to the first', () => {
    const { container } = render(
      <FactDeck sentences={SENTENCES} slides={SLIDES} />,
    );
    another();
    expect(fill(container)?.style.translate).toBe('1.5rem');
    another();
    another();
    expect(fill(container)?.style.translate).toBe('0rem');
  });

  it('glides at the selection pills’ pace', () => {
    const easing = String(GLIDE.easing).replaceAll(' ', '');
    expect(PIP_FILL).toContain(`duration-${GLIDE.duration}`);
    expect(PIP_FILL).toContain(`ease-[${easing}]`);
  });
});
