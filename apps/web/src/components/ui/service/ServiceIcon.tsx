import Image, { type ImageProps } from 'next/image';

import cn from '@/lib/cn';

/** One place's look for the icon: its box in pixels and its classes */
export type ServiceIconLayout = Readonly<{
  className: string;
  /** the image's width and height; the classes draw the size on screen */
  size: number;
}>;

type Props = Readonly<{
  alt: string;
  layout: ServiceIconLayout;
  loading?: ImageProps['loading'];
  /** the service's square logo */
  logo: string;
  sizes?: string;
  title?: string;
}>;

/**
 * A streaming service's square logo (where to watch, Watches on, the
 * pickers, the channel rows). Presentational: a service without a logo is
 * each place's own call (nothing, an empty slot, a grey square). Each place
 * keeps its own size and corners through its layout; every one has the
 * image rim, as a black square logo (Netflix, Max) melts into the ground.
 */
export default function ServiceIcon({
  alt,
  layout,
  loading,
  logo,
  sizes,
  title,
}: Props) {
  const className = cn('image-outline', layout.className);
  return (
    <Image
      alt={alt}
      className={className}
      height={layout.size}
      loading={loading}
      sizes={sizes}
      src={logo}
      title={title}
      width={layout.size}
    />
  );
}
