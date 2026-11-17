import BackgroundDynamic from './BackgroundDynamic';
import BackgroundStatic from './BackgroundStatic';

export type BackgroundProps = Readonly<{
  animated?: boolean;
  color: string;
  image?: string;
  priority?: boolean;
}>;

/**
 * A page's backdrop: the image with side, radial and bottom gradients in the
 * page colour. `animated` crossfades when the store changes.
 */
export default function Background({
  animated = false,
  color,
  image,
  priority = false,
}: BackgroundProps) {
  return animated ? (
    <BackgroundDynamic priority={priority} />
  ) : (
    <BackgroundStatic color={color} image={image} priority={priority} />
  );
}
