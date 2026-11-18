import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * The theme in `globals.css` replaces Tailwind's type scale and radii, so
 * tailwind-merge has to know the new names. Without this, `text-title-2`
 * reads as a text colour and drops `text-white/80` (or the other way round).
 */
const twMerge = extendTailwindMerge({
  override: {
    theme: {
      radius: ['2', '4', '6', '8', '10', '12', '14', '16', '18', 'full'],
      text: [
        'display',
        'title-1',
        'title-2',
        'title-3',
        'body',
        'body-sm',
        'meta',
        'caption',
        'overline',
        'numeral',
        'numeral-xl',
      ],
    },
  },
});

export default function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
