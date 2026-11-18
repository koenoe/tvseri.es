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
  // the logo API's silhouette flag decides white drawing vs a light chip
  it('whitens a silhouette logo, without a chip', () => {
    const { container } = draw({});
    const logo = screen.getByAltText('Network');
    expect(container.firstElementChild).toBe(logo);
    expect(logo.className).toContain('invert');
  });

  it('puts a filled logo in its own colours on a chip', () => {
    const { container } = draw({ silhouette: false });
    const logo = screen.getByAltText('Network');
    expect(container.firstElementChild).not.toBe(logo);
    expect(container.firstElementChild?.contains(logo)).toBe(true);
    expect(logo.className).not.toContain('invert');
  });

  it('keeps a kept logo’s own colours without a chip', () => {
    const { container } = draw({ keep: true, silhouette: false });
    const logo = screen.getByAltText('Network');
    expect(container.firstElementChild).toBe(logo);
    expect(logo.className).not.toContain('invert');
  });
});
