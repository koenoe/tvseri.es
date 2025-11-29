import BackgroundDynamic from './BackgroundDynamic';
import BackgroundStatic from './BackgroundStatic';

export type BackgroundVariant = 'static' | 'dynamic';
// TODO: find a better name for this as it's confusing
// with React Context, lol
export type BackgroundContext = 'page' | 'spotlight' | 'dots' | 'grid';

export type Props = Readonly<{
  variant: BackgroundVariant;
  context: BackgroundContext;
  color: string;
  image?: string;
  priority?: boolean;
}>;

function Background({
  variant = 'static',
  context,
  color,
  image,
  priority = false,
}: Props) {
  return variant === 'static' ? (
    <BackgroundStatic
      color={color}
      context={context}
      image={image}
      priority={priority}
    />
  ) : (
    <BackgroundDynamic context={context} priority={priority} />
  );
}

export default Background;
