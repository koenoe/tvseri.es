import { twMerge } from 'tailwind-merge';

import SvgGlowAnimate from './SvgGlowAnimate';

const COLORS = ['#00FFFF', '#666666', '#FF0080'] as const; // cyan, grey, magenta

const LINE_CONFIG = [
  { delay: 0, height: 0, className: 'block' },
  { delay: 800, height: 72, className: 'hidden md:block' },
  { delay: 1700, height: 0, className: 'block' },
  { delay: 400, height: 0, className: 'hidden md:block' },
  { delay: 1200, height: 68, className: 'block' },
  { delay: 2000, height: 0, className: 'hidden md:block' },
  { delay: 600, height: 72, className: 'block' },
  { delay: 1500, height: 0, className: 'hidden md:block' },
  { delay: 300, height: 0, className: 'block' },
  { delay: 1800, height: 70, className: 'hidden md:block' },
  { delay: 900, height: 71, className: 'block' },
  { delay: 1300, height: 0, className: 'hidden md:block' },
  { delay: 500, height: 69, className: 'block' },
  { delay: 1600, height: 0, className: 'hidden md:block' },
] as const;

type SvgGlowAnimatePatternProps = {
  className?: string;
};

export default function SvgGlowAnimatePattern({
  className,
}: SvgGlowAnimatePatternProps) {
  return (
    <div
      className={twMerge(
        'flex transform-gpu items-center gap-3 lg:gap-5',
        className,
      )}
    >
      {LINE_CONFIG.map((config, index) => (
        <SvgGlowAnimate
          key={index + 1}
          id={index + 1}
          movementDelay={config.delay}
          additionalHeight={config.height}
          color={COLORS[index % COLORS.length]}
          className={config.className}
        />
      ))}
    </div>
  );
}
