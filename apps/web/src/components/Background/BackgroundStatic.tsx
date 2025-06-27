import type { Props } from './Background';
import BackgroundBase, { backgroundBaseStyles } from './BackgroundBase';

function BackgroundStatic({
  color,
  context,
  image,
}: Pick<Props, 'color' | 'context' | 'image'>) {
  return (
    <div className={backgroundBaseStyles()}>
      <BackgroundBase color={color} context={context} image={image} />
    </div>
  );
}

export default BackgroundStatic;
