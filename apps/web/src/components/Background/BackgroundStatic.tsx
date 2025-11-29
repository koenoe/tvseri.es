import type { Props } from './Background';
import BackgroundBase, { backgroundBaseStyles } from './BackgroundBase';

function BackgroundStatic({
  color,
  context,
  image,
  priority = false,
}: Pick<Props, 'color' | 'context' | 'image'> & { priority?: boolean }) {
  return (
    <div className={backgroundBaseStyles()}>
      <BackgroundBase
        color={color}
        context={context}
        image={image}
        priority={priority}
      />
    </div>
  );
}

export default BackgroundStatic;
