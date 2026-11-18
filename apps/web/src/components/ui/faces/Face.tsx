import Image from 'next/image';
import type { ComponentProps } from 'react';

import TileLink from '@/components/ui/tile/TileLink';
import { PERSON_PREFETCH } from '@/components/ui/tile/tilePrefetch';

/**
 * How one place draws a cast face: the link's place in its row, the photo's
 * ring, size and grow, and the name and role under it. `size` is the photo's
 * intrinsic size (a square), `sizes` its widest drawn width.
 */
export type FaceLook = Readonly<{
  /** the circle of a person without a photo, where a place shows them */
  blank?: string;
  caption: string;
  link: string;
  name: string;
  photo: string;
  role: string;
  size: number;
  sizes: string;
}>;

type Props = Omit<
  ComponentProps<typeof TileLink>,
  'aria-label' | 'children' | 'className' | 'prefetchOn'
> &
  Readonly<{
    /** the photo's alt: the name, or '' where the link's label says it */
    alt: string;
    /** '' or null: no photo */
    image: string | null;
    /** the link's name: "Ayo Edebiri as Sydney" */
    label: string;
    look: FaceLook;
    name: string;
    role: string;
  }>;

/**
 * One cast face linking to the person: a round photo with a 2px white ring,
 * and the name and role under it. Only the drawing: each place passes its
 * look, and its own link behaviour (a tap that reveals first) as props.
 */
export default function Face({
  alt,
  image,
  label,
  look,
  name,
  role,
  ...link
}: Props) {
  return (
    <TileLink
      {...link}
      aria-label={label}
      className={look.link}
      prefetchOn={PERSON_PREFETCH}
    >
      {image ? (
        <Image
          alt={alt}
          className={look.photo}
          height={look.size}
          sizes={look.sizes}
          src={image}
          width={look.size}
        />
      ) : (
        <span className={look.blank} />
      )}
      <span aria-hidden="true" className={look.caption}>
        <b className={look.name}>{name}</b>
        <span className={look.role}>{role}</span>
      </span>
    </TileLink>
  );
}
