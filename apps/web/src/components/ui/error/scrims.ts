import type { CSSProperties } from 'react';

import { hexWithAlpha as withAlpha } from '@/lib/color';

const TOP = 'linear-gradient(180deg, rgb(0 0 0 / 0.5) 0%, rgb(0 0 0 / 0) 20%)';

/**
 * The error scenes' scrims in the still's own ground colour, never text on a busy
 * area: 50% black under the header, then (desktop) left 95 → 86 → 0% and
 * bottom 92 → 0%, or (phone) the still fading into the ground below it.
 */
export function stillScrims(ground: string): Readonly<{
  desktop: CSSProperties;
  phone: CSSProperties;
}> {
  return {
    desktop: {
      backgroundImage: `${TOP}, linear-gradient(90deg, ${withAlpha(ground, 0.95)} 0%, ${withAlpha(ground, 0.86)} 32%, ${withAlpha(ground, 0)} 64%), linear-gradient(0deg, ${withAlpha(ground, 0.92)} 0%, ${withAlpha(ground, 0)} 44%)`,
    },
    phone: {
      backgroundImage: `${TOP}, linear-gradient(0deg, ${ground} 0%, ${withAlpha(ground, 0.9)} 36%, ${withAlpha(ground, 0)} 74%)`,
    },
  };
}
