import type { AppTileLook } from '@/components/brand/appTiles';

/** One app's brand classes. Full class strings, so Tailwind sees each one */
export type AppBrandLook = AppTileLook &
  Readonly<{
    /** Available: neutral ground, a 2px top edge in the brand's colour */
    available: string;
    /** Connected: the brand-tinted panel */
    connected: string;
    /** A receiving status dot */
    dot: string;
    /** The fact pills after the state pill; the skeleton draws the same */
    facts: ReadonlyArray<string>;
    /** The hairline under rows on the connected panel */
    hairline: string;
    name: string;
    /** A connected state pill, filled with the brand's colour */
    pill: string;
  }>;
