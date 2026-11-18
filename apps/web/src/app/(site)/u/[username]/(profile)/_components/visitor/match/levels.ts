import type { TasteLevel } from '@tvseri.es/schemas';

/**
 * The six compatibility levels: the word, the colour (hex and its rgb
 * triplet, for the glow and the proof underline) and the strength of the
 * card's corner tint. Static class strings so Tailwind sees them.
 */
export type LevelStyle = Readonly<{
  word: string;
  hex: string;
  rgb: string;
  tint: number;
  /** The text colour, for the level word */
  text: string;
  /** The lane dot's fill (`Lane`'s `dotColour`) */
  dot: string;
}>;

export const LEVELS: Readonly<Record<TasteLevel, LevelStyle>> = {
  high: {
    dot: 'bg-[#dfd05a]',
    hex: '#dfd05a',
    rgb: '223 208 90',
    text: 'text-[#dfd05a]',
    tint: 0.1,
    word: 'High',
  },
  low: {
    dot: 'bg-[#ff8f4a]',
    hex: '#ff8f4a',
    rgb: '255 143 74',
    text: 'text-[#ff8f4a]',
    tint: 0.08,
    word: 'Low',
  },
  medium: {
    dot: 'bg-[#f2b95f]',
    hex: '#f2b95f',
    rgb: '242 185 95',
    text: 'text-[#f2b95f]',
    tint: 0.09,
    word: 'Medium',
  },
  super: {
    dot: 'bg-[#8fdc5a]',
    hex: '#8fdc5a',
    rgb: '143 220 90',
    text: 'text-[#8fdc5a]',
    tint: 0.13,
    word: 'Super',
  },
  'very-high': {
    dot: 'bg-[#b4da55]',
    hex: '#b4da55',
    rgb: '180 218 85',
    text: 'text-[#b4da55]',
    tint: 0.11,
    word: 'Very high',
  },
  'very-low': {
    dot: 'bg-[#e8857a]',
    hex: '#e8857a',
    rgb: '232 133 122',
    text: 'text-[#e8857a]',
    tint: 0.07,
    word: 'Very low',
  },
};

/** No level (under 5 shared shows): white, quiet */
const NO_LEVEL: LevelStyle = {
  dot: 'bg-white',
  hex: 'rgb(255 255 255 / 0.75)',
  rgb: '255 255 255',
  text: 'text-white/75',
  tint: 0.04,
  word: '',
};

export const levelStyle = (level: TasteLevel | null): LevelStyle =>
  level ? LEVELS[level] : NO_LEVEL;
