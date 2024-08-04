import { type BackgroundContext } from './Background';
import BackgroundBase, { backgroundBaseStyles } from './BackgroundBase';

function BackgroundStatic({
  color,
  context,
  image,
}: Readonly<{ color: string; image: string; context: BackgroundContext }>) {
  return (
    <div className={backgroundBaseStyles()}>
      <BackgroundBase color={color} image={image} context={context} />
    </div>
  );
}

export default BackgroundStatic;
