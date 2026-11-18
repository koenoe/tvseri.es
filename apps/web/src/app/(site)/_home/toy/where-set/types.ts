import type { LabelSide } from './labelSide';

/** A pin on the map and the shows set there, as the explorer island gets them */
export type MapPlace = Readonly<{
  /** Which side of the pin its label takes on a phone and from md (`labelSides`) */
  label: Readonly<{ phone: LabelSide; wide: LabelSide }>;
  /** The pin's position over the map, in % of its width and height */
  left: string;
  name: string;
  shows: ReadonlyArray<
    Readonly<{
      href: string;
      /** Index into the explorer's `images` and `metas` */
      image: number;
      title: string;
    }>
  >;
  slug: string;
  top: string;
}>;
