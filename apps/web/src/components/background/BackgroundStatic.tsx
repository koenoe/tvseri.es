import type { BackgroundProps } from './Background';
import BackgroundBase, { backgroundBaseStyles } from './BackgroundBase';

export default function BackgroundStatic({
  color,
  context,
  image,
  priority = false,
}: Pick<BackgroundProps, 'color' | 'context' | 'image' | 'priority'>) {
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
