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
}>;

function Background({ variant = 'static', context, color, image }: Props) {
  return variant === 'static' ? (
    <BackgroundStatic context={context} color={color} image={image} />
  ) : (
    <BackgroundDynamic context={context} />
  );
}

export default Background;
