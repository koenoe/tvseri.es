// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import NetworkWordmark from './NetworkWordmark';

vi.mock('next/image', () => ({
  default: ({
    alt,
    className,
    src,
  }: {
    alt: string;
    className: string;
    src: string;
  }) => (
    // biome-ignore lint/performance/noImgElement: test double
    <img alt={alt} className={className} src={src} />
  ),
}));

const LOGO = 'https://image.tmdb.org/t/p/w500/logo.png';

const draw = (props: Readonly<{ keep?: boolean; silhouette?: boolean }>) =>
  render(
    <NetworkWordmark
      alt="Network"
      className="h-8 w-24 object-left"
      height={64}
      sizes="96px"
      src={LOGO}
      width={192}
      {...props}
    />,
  );

describe('NetworkWordmark', () => {
  it('draws a logo that reads as a silhouette white, in the place’s box', () => {
    const { container } = draw({});
    const logo = screen.getByAltText('Network');
    expect(container.firstElementChild).toBe(logo);
    expect(logo.className).toContain('brightness-0 invert');
    expect(logo.className).toContain('h-8 w-24');
  });

  it('draws a filled logo in its own colours on a light chip of the place’s height', () => {
    const { container } = draw({ silhouette: false });
    const chip = container.firstElementChild as HTMLElement;
    const logo = screen.getByAltText('Network');
    expect(chip.tagName).toBe('SPAN');
    expect(chip.className).toContain('bg-white/92');
    expect(chip.className).toContain('rounded-6');
    expect(chip.className).toContain('h-8');
    // the chip hugs the logo instead of taking the place's width
    expect(chip.className).toContain('w-fit');
    expect(chip.className).not.toContain('w-24');
    expect(chip.firstElementChild).toBe(logo);
    expect(logo.className).not.toContain('invert');
    expect(logo.className).toContain('h-full');
  });

  it('keeps a kept logo’s own colours without a chip', () => {
    const { container } = draw({ keep: true, silhouette: false });
    const logo = screen.getByAltText('Network');
    expect(container.firstElementChild).toBe(logo);
    expect(logo.className).not.toContain('invert');
  });
});
