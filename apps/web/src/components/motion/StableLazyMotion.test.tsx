// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { domMax } from 'motion/react';
import * as m from 'motion/react-m';
import { memo } from 'react';
import { describe, expect, it, vi } from 'vitest';

import StableLazyMotion from './StableLazyMotion';

const loadMax = () => Promise.resolve(domMax);

describe('StableLazyMotion', () => {
  it('a lazy bundle that lands gives the kept subtree its renderer', async () => {
    render(
      <StableLazyMotion features={loadMax}>
        <m.div
          animate={{ opacity: 1 }}
          data-testid="probe"
          initial={{ opacity: 0 }}
        />
      </StableLazyMotion>,
    );
    await vi.waitFor(() =>
      expect(screen.getByTestId('probe').style.opacity).toBe('1'),
    );
  });

  it.each([
    ['a lazy bundle', loadMax],
    ['a loaded bundle', domMax],
  ] as const)(
    'with %s, a parent render re-renders only what changed below, not every `m` element',
    async (_, features) => {
      const renders = { a: 0, b: 0 };
      function Probe({ name }: Readonly<{ name: 'a' | 'b' }>) {
        renders[name] += 1;
        return <span data-testid={name} />;
      }
      // `m.create(Probe)` renders Probe each time its motion component renders
      const MotionProbe = m.create(Probe);
      const Row = memo(function Row({ name }: Readonly<{ name: 'a' | 'b' }>) {
        return <MotionProbe name={name} />;
      });
      const tree = (name: 'a' | 'b') => (
        <StableLazyMotion features={features}>
          <Row name="a" />
          <Row name={name} />
        </StableLazyMotion>
      );
      const { rerender } = render(tree('b'));
      await act(async () => {});
      const before = { ...renders };
      // a new subtree in which only the second row changed
      rerender(tree('a'));
      expect(renders.a - before.a).toBe(1);
      expect(renders.b).toBe(before.b);
    },
  );
});
