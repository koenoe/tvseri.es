import BackgroundDynamic from './BackgroundDynamic';
import BackgroundStatic from './BackgroundStatic';

/**
 * How a page's backdrop is drawn: `page` (show page: backdrop + side and
 * bottom gradients), `spotlight` (home: dimmed backdrop), `dots` and `grid`
 * (no backdrop, a faint pattern; drawn by Page).
 */
export type BackgroundContext = 'page' | 'spotlight' | 'dots' | 'grid';

export type BackgroundProps = Readonly<{
  animated?: boolean;
  context: BackgroundContext;
  color: string;
  image?: string;
  priority?: boolean;
}>;

/** `animated` pages (carousels) crossfade when the store changes. */
export default function Background({
  animated = false,
  context,
  color,
  image,
  priority = false,
}: BackgroundProps) {
  return animated ? (
    <BackgroundDynamic context={context} priority={priority} />
  ) : (
    <BackgroundStatic
      color={color}
      context={context}
      image={image}
      priority={priority}
    />
  );
}
