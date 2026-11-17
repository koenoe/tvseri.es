import type { BackgroundProps } from './Background';
import BackgroundBase, { backgroundBaseStyles } from './BackgroundBase';

export default function BackgroundStatic({
  color,
  image,
  priority = false,
}: Pick<BackgroundProps, 'color' | 'image' | 'priority'>) {
  return (
    <div className={backgroundBaseStyles()}>
      <BackgroundBase color={color} image={image} priority={priority} />
    </div>
  );
}
