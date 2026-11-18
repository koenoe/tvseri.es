import { hexChannels, type Rgb } from '@tvseri.es/utils';

import { toPageColor } from './pageColor';

/** `#1c2223` → `[28, 34, 35]`, for `rgba()` gradients; anything that isn't a six-digit hex reads as the ground. */
export default function hexToRgb(hex: string): Rgb {
  return hexChannels(toPageColor(hex));
}
