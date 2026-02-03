import BackgroundDynamic from './BackgroundDynamic';
import BackgroundStatic from './BackgroundStatic';

// TODO: find a better name for this as it's confusing
// with React Context, lol
export type BackgroundContext = 'page' | 'spotlight' | 'dots' | 'grid';

export type Props = Readonly<{
  animated?: boolean;
  context: BackgroundContext;
  color: string;
  image?: string;
  priority?: boolean;
}>;

function Background({
  animated = false,
  context,
  color,
  image,
  priority = false,
}: Props) {
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

export default Background;
